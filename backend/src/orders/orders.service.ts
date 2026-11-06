
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { TOPPING_PRICE } from './dto/create-order-item.dto';
import { InventoryService } from '../inventory/inventory.service';
import { IngredientInventoryService } from '../inventory/ingredient-inventory.service';

const SIZE_EXTRA: Record<string, number> = {
  S: 0,
  M: 5000,
  L: 10000,
  ONE_SIZE: 0,
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly ingredientInventoryService: IngredientInventoryService,
  ) {}

  async createOrder(dto: CreateOrderDto, userId: string) {
    // 1. Lay danh sach productId khong trung nhau
    const productIds = [...new Set(dto.items.map((i) => i.productId))];

    // 2. Lay thong tin san pham tu database
    const products = await this.productRepository.findBy({
      id: In(productIds),
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const missing = productIds.filter((id) => !productMap.has(id));

    if (missing.length) {
      throw new NotFoundException(
        `San pham khong ton tai: ${missing.join(', ')}`,
      );
    }

    // 3. Tinh gia don hang
    let orderTotal = 0;
    const orderItemsData: Partial<OrderItem>[] = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      const toppings = item.toppings ?? [];

      const toppingExtra = toppings.reduce(
        (sum, topping) => sum + (TOPPING_PRICE[topping] ?? 0),
        0,
      );

      const unitPrice =
        product.price + SIZE_EXTRA[item.size] + toppingExtra;

      const lineTotal = unitPrice * item.qty;
      orderTotal += lineTotal;

      orderItemsData.push({
        productId: item.productId,
        productName: product.name,
        size: item.size,
        toppings,
        qty: item.qty,
        unitPrice,
        lineTotal,
      });
    }

    // 4. Tao transaction
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 5. Tru ton kho trong cung transaction
      await this.inventoryService.decreaseStock(
        queryRunner.manager,
        dto.items.map((item) => ({
          productId: item.productId,
          quantity: item.qty,
        })),
      );

      // 6. Tao don hang
      const order = queryRunner.manager.create(Order, {
        userId,
        status: OrderStatus.PENDING,
        total: orderTotal,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // 7. Luu chi tiet don hang
      const itemsToSave = orderItemsData.map((item) =>
        queryRunner.manager.create(OrderItem, {
          ...item,
          orderId: savedOrder.id,
        }),
      );

      const savedItems = await queryRunner.manager.save(itemsToSave);

      // 8. Giu nguyen lieu theo cong thuc va size
      await this.ingredientInventoryService.reserveIngredients(
        queryRunner.manager,
        savedOrder.id,
        savedItems,
      );

      // 8. Hoan tat transaction
      await queryRunner.commitTransaction();

      return {
        message: 'Tạo đơn hàng thành công',
        orderId: savedOrder.id,
        status: savedOrder.status,
        total: savedOrder.total,
        createdAt: savedOrder.createdAt,
        items: savedItems,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // Xu ly lich su don hang cua user hien tai
  async getMyOrders(userId: string) {
    const orders = await this.orderRepository.find({
      where: { userId },
      relations: {
        items: true,
      },
      order: {
        createdAt: 'DESC',
      },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        items: {
          id: true,
          productId: true,
          productName: true,
          size: true,
          toppings: true,
          qty: true,
          unitPrice: true,
          lineTotal: true,
        },
      },
    });

    return {
      message: 'Lấy lịch sử đơn hàng thành công',
      data: orders,
    };
  }
}
