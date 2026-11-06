import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { TOPPING_PRICE } from './dto/create-order-item.dto';

const SIZE_EXTRA: Record<string, number> = { S: 0, M: 5000, L: 10000 };

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  async createOrder(dto: CreateOrderDto, userId: string) {
    // 1. Lấy danh sách productId (loại trùng)
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    
    // 2. Tra giá từ DB, không tin giá client gửi
    const products = await this.productRepository.findBy({ id: In(productIds) });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const missing = productIds.filter((id) => !productMap.has(id));
    if (missing.length) {
      throw new NotFoundException(`Sản phẩm không tồn tại: ${missing.join(', ')}`);
    }
   

    // 3. Kiểm tra tồn kho cơ bản (chống đặt đồng thời làm ở Task 10)
    const qtyByProduct = new Map<string, number>();
    for (const i of dto.items) {
      qtyByProduct.set(i.productId, (qtyByProduct.get(i.productId) ?? 0) + i.qty);
    }
    for (const [id, qty] of qtyByProduct) {
      const p = productMap.get(id)!;
      if (p.stock < qty) {
        throw new BadRequestException(`"${p.name}" chỉ còn ${p.stock} sản phẩm`);
      }
    }

    // 4. Tính lineTotal và orderTotal
    let orderTotal = 0;
    const orderItemsData: Partial<OrderItem>[] = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      const toppings = item.toppings ?? [];

      const toppingExtra = toppings.reduce((s, t) => s + (TOPPING_PRICE[t] ?? 0), 0);
      const unitPrice = product.price + SIZE_EXTRA[item.size] + toppingExtra;
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

    // 5. Lưu bằng transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = queryRunner.manager.create(Order, {
        userId,
        status: OrderStatus.PENDING,
        total: orderTotal,
      });
      const savedOrder = await queryRunner.manager.save(order);

      const itemsToSave = orderItemsData.map((item) =>
        queryRunner.manager.create(OrderItem, { ...item, orderId: savedOrder.id }),
      );
      await queryRunner.manager.save(itemsToSave);

      await queryRunner.commitTransaction();

      return {
        message: 'Tạo đơn hàng thành công',
        orderId: savedOrder.id,
        status: savedOrder.status,
        total: savedOrder.total,
        createdAt: savedOrder.createdAt,
        items: itemsToSave,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
    // xu ly lich su don hang cua user hien tai
  async getMyOrders(userId: string) {
    const orders = await this.orderRepository.find({
      where: { userId },

      // Lấy danh sách sản phẩm thuộc từng đơn hàng
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
  }
    });

  return {
    message: 'Lấy lịch sử đơn hàng thành công',
    data: orders,
    };
  }
}