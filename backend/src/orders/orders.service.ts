
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductSizePrice } from '../products/entities/product-size-price.entity';

import { CreateOrderDto } from './dto/create-order.dto';
import { TOPPING_PRICE } from './dto/create-order-item.dto';

import { InventoryService } from '../inventory/inventory.service';
import { IngredientInventoryService } from '../inventory/ingredient-inventory.service';

import { PromoCode } from '../promotions/entities/promo-code.entity';
import { PromotionsService } from '../promotions/promotions.service';

import { OrderStateMachineService } from './services/order-state-machine.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    private readonly dataSource: DataSource,
    private readonly inventoryService: InventoryService,
    private readonly ingredientInventoryService: IngredientInventoryService,
    private readonly promotionsService: PromotionsService,
    private readonly stateMachine: OrderStateMachineService,
  ) {}

  async createOrder(dto: CreateOrderDto, userId: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Giỏ hàng không được để trống');
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Khóa tài khoản để tránh hai đơn đồng thời sử dụng cùng số điểm.
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('Không tìm thấy tài khoản');
      }

      // 2. Lấy danh sách sản phẩm không trùng nhau.
      const productIds = [
        ...new Set(dto.items.map((item) => item.productId)),
      ];

      const products = await manager.find(Product, {
        where: { id: In(productIds) },
      });

      const productMap = new Map(
        products.map((product) => [product.id, product]),
      );

      const missing = productIds.filter(
        (id) => !productMap.has(id),
      );

      if (missing.length > 0) {
        throw new NotFoundException(
          `Không tìm thấy sản phẩm: ${missing.join(', ')}`,
        );
      }

      for (const product of products) {
        if (!product.isActive) {
          throw new BadRequestException(
            `Sản phẩm "${product.name}" hiện đã ngừng kinh doanh`,
          );
        }
      }

      // 3. Lấy giá từng size từ database.
      const sizePrices = await manager.find(ProductSizePrice, {
        where: {
          productId: In(productIds),
        },
      });

      const priceMap = new Map(
        sizePrices.map((item) => [
          `${item.productId}_${item.size}`,
          item.price,
        ]),
      );

      // 4. Tính giá đơn hàng.
      let subtotal = 0;
      const orderItemsData: Partial<OrderItem>[] = [];

      for (const item of dto.items) {
        if (!Number.isInteger(item.qty) || item.qty <= 0) {
          throw new BadRequestException(
            'Số lượng sản phẩm phải là số nguyên dương',
          );
        }

        const product = productMap.get(item.productId)!;
        const toppings = item.toppings ?? [];

        const sizePrice = priceMap.get(
          `${item.productId}_${item.size}`,
        );

        if (sizePrice === undefined) {
          throw new BadRequestException(
            `Sản phẩm "${product.name}" không có size ${item.size}`,
          );
        }

        const toppingExtra = toppings.reduce(
          (sum, topping) =>
            sum + (TOPPING_PRICE[topping] ?? 0),
          0,
        );

        const unitPrice = sizePrice + toppingExtra;
        const lineTotal = unitPrice * item.qty;

        subtotal += lineTotal;

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

      if (!Number.isSafeInteger(subtotal) || subtotal <= 0) {
        throw new BadRequestException(
          'Tổng tiền đơn hàng không hợp lệ',
        );
      }

      // 5. Phân loại tồn kho theo inventoryMode.
      const invalidInventoryItems = dto.items.filter((item) => {
        const mode = productMap.get(item.productId)?.inventoryMode;

        return mode !== 'INGREDIENT' && mode !== 'FINISHED_GOOD';
      });

      if (invalidInventoryItems.length > 0) {
        throw new BadRequestException(
          'Loại quản lý tồn kho không hợp lệ',
        );
      }

      const finishedGoodItems = dto.items.filter(
        (item) =>
          productMap.get(item.productId)?.inventoryMode === 'FINISHED_GOOD',
      );

      // Chỉ trừ tồn kho thành phẩm.
      if (finishedGoodItems.length > 0) {
        await this.inventoryService.decreaseStock(
          manager,
          finishedGoodItems.map((item) => ({
            productId: item.productId,
            quantity: item.qty,
          })),
        );
      }

      // 6. Kiểm tra và áp dụng mã khuyến mãi.
      let promoCode: string | null = null;
      let discountAmount = 0;

      if (dto.promoCode?.trim()) {
        promoCode = dto.promoCode.trim().toUpperCase();

        const promo = await manager.findOne(PromoCode, {
          where: { code: promoCode },
          lock: { mode: 'pessimistic_write' },
        });

        if (!promo) {
          throw new BadRequestException(
            'Mã khuyến mãi không tồn tại',
          );
        }

        this.promotionsService.assertUsable(promo, subtotal);

        discountAmount =
          this.promotionsService.calculateDiscount(
            promo,
            subtotal,
          );

        promo.usedCount += 1;
        await manager.save(PromoCode, promo);
      }

      const afterPromo = subtotal - discountAmount;

      if (afterPromo <= 0) {
        throw new BadRequestException(
          'Tổng tiền sau khuyến mãi không hợp lệ',
        );
      }

      // 7. Tính số điểm đã được giữ ở các đơn chưa thanh toán.
      const reservedRow = await manager
        .createQueryBuilder(Order, 'reserved')
        .select(
          'COALESCE(SUM(reserved.pointsRedeemed), 0)',
          'points',
        )
        .where('reserved.userId = :userId', { userId })
        .andWhere('reserved.status IN (:...statuses)', {
          statuses: [
            OrderStatus.PENDING,
            OrderStatus.PAYMENT_FAILED,
          ],
        })
        .getRawOne<{ points: string }>();

      const reservedPoints = Number(
        reservedRow?.points ?? 0,
      );

      const availablePoints = Math.max(
        0,
        (user.loyaltyPoints ?? 0) - reservedPoints,
      );

      const requestedPoints = dto.pointsToRedeem ?? 0;

      if (
        !Number.isSafeInteger(requestedPoints) ||
        requestedPoints < 0
      ) {
        throw new BadRequestException(
          'Số điểm sử dụng không hợp lệ',
        );
      }

      if (requestedPoints > availablePoints) {
        throw new ConflictException(
          `Bạn chỉ còn ${availablePoints.toLocaleString('vi-VN')} điểm khả dụng`,
        );
      }

      // 1 điểm = 1 VND. Giữ lại ít nhất 1 VND để thanh toán.
      const pointsRedeemed = Math.min(
        requestedPoints,
        Math.max(0, afterPromo - 1),
      );

      const pointsDiscountAmount = pointsRedeemed;
      const total = afterPromo - pointsDiscountAmount;

      // 8. Tạo đơn hàng.
      const order = manager.create(Order, {
        userId,
        status: OrderStatus.PENDING,
        subtotal,
        discountAmount,
        promoCode,
        total,
        pointsRedeemed,
        pointsDiscountAmount,
        rewardPointsEarned: 0,
        loyaltyAwardedAt: null,
      });

      const savedOrder = await manager.save(Order, order);

      // 9. Lưu chi tiết đơn hàng.
      const itemsToSave = orderItemsData.map((item) =>
        manager.create(OrderItem, {
          ...item,
          orderId: savedOrder.id,
        }),
      );

      const savedItems = await manager.save(
        OrderItem,
        itemsToSave,
      );

      // 10. Giữ nguyên liệu cho tất cả sản phẩm quản lý theo INGREDIENT.
      const itemsUsingIngredients = savedItems.filter(
        (item) =>
          productMap.get(item.productId)?.inventoryMode === 'INGREDIENT',
      );

      if (itemsUsingIngredients.length > 0) {
        await this.ingredientInventoryService.reserveIngredients(
          manager,
          savedOrder.id,
          itemsUsingIngredients,
        );
      }
      return {
        message: 'Tạo đơn hàng thành công',
        orderId: savedOrder.id,
        status: savedOrder.status,
        subtotal,
        promoCode,
        discountAmount,
        pointsRedeemed,
        pointsDiscountAmount,
        availablePoints,
        total,
        createdAt: savedOrder.createdAt,
        items: savedItems,
      };
    });
  }

  // Cập nhật trạng thái đơn hàng.
  async updateOrderStatus(
    orderId: string,
    userId: string,
    nextStatus: OrderStatus,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      const previousStatus = order.status;

      order.status = this.stateMachine.transition(
        order.status,
        nextStatus,
      );

      // Hủy đơn chưa thanh toán: hoàn tồn kho và giải phóng nguyên liệu.
      if (
        nextStatus === OrderStatus.CANCELLED &&
        (
          previousStatus === OrderStatus.PENDING ||
          previousStatus === OrderStatus.PAYMENT_FAILED
        )
      ) {
        const items = await manager.find(OrderItem, {
          where: { orderId: order.id },
        });

        const productIds = [
          ...new Set(items.map((item) => item.productId)),
        ];

        const products = await manager.find(Product, {
          where: { id: In(productIds) },
        });

        const productMap = new Map(
          products.map((product) => [product.id, product]),
        );

        for (const item of items) {
          const product = productMap.get(item.productId);

          if (!product) {
            throw new NotFoundException(
              `Không tìm thấy sản phẩm ${item.productId}`,
            );
          }

          // Chỉ hoàn tồn kho thành phẩm.
          if (product.inventoryMode === 'FINISHED_GOOD') {
            await manager
              .createQueryBuilder()
              .update(Product)
              .set({
                stock: () => `"stock" + ${item.qty}`,
                version: () => '"version" + 1',
              })
              .where('"id" = :id', {
                id: item.productId,
              })
              .execute();
          }
        }

        // Giải phóng nguyên liệu đã giữ.
        await this.ingredientInventoryService.releaseIngredients(
          manager,
          order.id,
        );

        // Hoàn lại lượt sử dụng mã khuyến mãi.
        if (order.promoCode) {
          const promo = await manager.findOne(PromoCode, {
            where: { code: order.promoCode },
            lock: { mode: 'pessimistic_write' },
          });

          if (promo && promo.usedCount > 0) {
            promo.usedCount -= 1;
            await manager.save(PromoCode, promo);
          }
        }
      }
      await manager.save(Order, order);

      return {
        orderId: order.id,
        status: order.status,
        message: 'Cập nhật trạng thái đơn hàng thành công',
      };
    });
  }

  // Lấy lịch sử đơn hàng của người dùng hiện tại.
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
        subtotal: true,
        discountAmount: true,
        promoCode: true,
        pointsRedeemed: true,
        pointsDiscountAmount: true,
        rewardPointsEarned: true,
        loyaltyAwardedAt: true,
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
