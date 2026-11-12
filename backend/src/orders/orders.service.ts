import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { TOPPING_PRICE } from './dto/create-order-item.dto';
import { PromoCode } from '../promotions/entities/promo-code.entity';
import { PromotionsService } from '../promotions/promotions.service';
import { OrderStateMachineService } from './services/order-state-machine.service';
import { User } from '../users/entities/user.entity';

const SIZE_EXTRA: Record<string, number> = { S: 0, M: 5000, L: 10000 };

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly promotionsService: PromotionsService,
    private readonly stateMachine: OrderStateMachineService,
  ) {}

  async createOrder(dto: CreateOrderDto, userId: string) {
    if (!dto.items?.length) throw new BadRequestException('Giỏ hàng không được để trống');
    const qtyByProduct = new Map<string, number>();
    for (const item of dto.items) qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.qty);

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
      if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

      const productIds = [...qtyByProduct.keys()].sort();
      const products = await manager.find(Product, { where: { id: In(productIds) }, order: { id: 'ASC' } });
      const productMap = new Map(products.map((product) => [product.id, product]));
      const missing = productIds.filter((id) => !productMap.has(id));
      if (missing.length) throw new NotFoundException(`Sản phẩm không tồn tại: ${missing.join(', ')}`);

      // Optimistic locking: update only if the stock and version are still the values read.
      // A concurrent order that changed the row causes affected=0 and this transaction fails.
      for (const [id, qty] of qtyByProduct) {
        const product = productMap.get(id)!;
        if (!Number.isInteger(product.stock) || product.stock < qty) {
          throw new ConflictException(`"${product.name}" không đủ tồn kho (còn ${product.stock})`);
        }
        const update = await manager.createQueryBuilder().update(Product)
          .set({ stock: () => `"stock" - ${qty}`, version: () => '"version" + 1' })
          .where('"id" = :id AND "version" = :version AND "stock" >= :qty', { id, version: product.version, qty })
          .execute();
        if (update.affected !== 1) throw new ConflictException(`Tồn kho sản phẩm "${product.name}" vừa thay đổi. Vui lòng thử lại.`);
      }

      let subtotal = 0;
      const itemRows: Partial<OrderItem>[] = dto.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const toppingExtra = (item.toppings ?? []).reduce((sum, topping) => sum + (TOPPING_PRICE[topping] ?? 0), 0);
        const unitPrice = Math.round(product.price + SIZE_EXTRA[item.size] + toppingExtra);
        const lineTotal = unitPrice * item.qty;
        subtotal += lineTotal;
        return { productId: item.productId, productName: product.name, size: item.size, toppings: item.toppings ?? [], qty: item.qty, unitPrice, lineTotal };
      });

      let promoCode: string | null = null;
      let discountAmount = 0;
      if (dto.promoCode?.trim()) {
        promoCode = dto.promoCode.trim().toUpperCase();
        const promo = await manager.findOne(PromoCode, { where: { code: promoCode }, lock: { mode: 'pessimistic_write' } });
        if (!promo) throw new BadRequestException('Mã khuyến mãi không tồn tại');
        this.promotionsService.assertUsable(promo, subtotal);
        discountAmount = this.promotionsService.calculateDiscount(promo, subtotal);
        promo.usedCount += 1;
        await manager.save(PromoCode, promo);
      }
      const afterPromo = subtotal - discountAmount;
      if (!Number.isSafeInteger(afterPromo) || afterPromo <= 0) throw new BadRequestException('Tổng tiền đơn hàng không hợp lệ');

      // Reserve points logically across unpaid orders. The balance itself is only
      // debited after payment succeeds; pending/failed orders count as reservations.
      const reservedRow = await manager.createQueryBuilder(Order, 'reserved')
        .select('COALESCE(SUM(reserved.pointsRedeemed), 0)', 'points')
        .where('reserved.userId = :userId', { userId })
        .andWhere('reserved.status IN (:...statuses)', { statuses: [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED] })
        .getRawOne<{ points: string }>();
      const reservedPoints = Number(reservedRow?.points ?? 0);
      const availablePoints = Math.max(0, (user.loyaltyPoints ?? 0) - reservedPoints);
      const requestedPoints = dto.pointsToRedeem ?? 0;
      if (!Number.isSafeInteger(requestedPoints) || requestedPoints < 0) throw new BadRequestException('Số điểm sử dụng không hợp lệ');
      if (requestedPoints > availablePoints) throw new ConflictException(`Bạn chỉ còn ${availablePoints.toLocaleString('vi-VN')} điểm khả dụng`);
      // 1 point = 1 VND. Keep at least 1 VND payable because Mock Bank
      // only processes positive payment amounts.
      const pointsRedeemed = Math.min(requestedPoints, Math.max(0, afterPromo - 1));
      const pointsDiscountAmount = pointsRedeemed;
      const total = afterPromo - pointsDiscountAmount;

      const order = manager.create(Order, {
        userId, status: OrderStatus.PENDING, subtotal, discountAmount, promoCode, total,
        pointsRedeemed, pointsDiscountAmount, rewardPointsEarned: 0, loyaltyAwardedAt: null,
      });
      const savedOrder = await manager.save(Order, order);
      const items = itemRows.map((row) => manager.create(OrderItem, { ...row, orderId: savedOrder.id }));
      await manager.save(OrderItem, items);
      return {
        message: 'Tạo đơn hàng thành công', orderId: savedOrder.id, status: savedOrder.status,
        subtotal, promoCode, discountAmount, pointsRedeemed, pointsDiscountAmount,
        availablePoints, total, createdAt: savedOrder.createdAt, items,
      };
    });
  }

  async updateOrderStatus(orderId: string, userId: string, nextStatus: OrderStatus) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id: orderId, userId }, lock: { mode: 'pessimistic_write' } });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      const previousStatus = order.status;
      order.status = this.stateMachine.transition(order.status, nextStatus);
      if (nextStatus === OrderStatus.CANCELLED && (previousStatus === OrderStatus.PENDING || previousStatus === OrderStatus.PAYMENT_FAILED)) {
        // Release stock and promo reservation when an unpaid order is cancelled.
        const items = await manager.find(OrderItem, { where: { orderId: order.id } });
        for (const item of items) {
          await manager.createQueryBuilder().update(Product)
            .set({ stock: () => `"stock" + ${item.qty}`, version: () => '"version" + 1' })
            .where('"id" = :id', { id: item.productId }).execute();
        }
        if (order.promoCode) {
          const promo = await manager.findOne(PromoCode, { where: { code: order.promoCode }, lock: { mode: 'pessimistic_write' } });
          if (promo && promo.usedCount > 0) { promo.usedCount -= 1; await manager.save(PromoCode, promo); }
        }
      }
      await manager.save(Order, order);
      return { orderId: order.id, status: order.status, message: 'Cập nhật trạng thái đơn hàng thành công' };
    });
  }

  async getMyOrders(userId: string) {
    const orders = await this.orderRepository.find({
      where: { userId }, relations: { items: true }, order: { createdAt: 'DESC' },
      select: { id: true, status: true, total: true, subtotal: true, discountAmount: true, promoCode: true, pointsRedeemed: true, pointsDiscountAmount: true, rewardPointsEarned: true, loyaltyAwardedAt: true, createdAt: true,
        items: { id: true, productId: true, productName: true, size: true, toppings: true, qty: true, unitPrice: true, lineTotal: true } },
    });
    return { message: 'Lấy lịch sử đơn hàng thành công', data: orders };
  }
}
