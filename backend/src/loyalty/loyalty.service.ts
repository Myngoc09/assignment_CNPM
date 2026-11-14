import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(LoyaltyTransaction)
    private readonly transactionRepository: Repository<LoyaltyTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async getSummary(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, loyaltyPoints: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    const reserved = await this.dataSource.getRepository(Order)
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.pointsRedeemed), 0)', 'points')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status IN (:...statuses)', { statuses: [OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED] })
      .getRawOne<{ points: string }>();
    const points = user.loyaltyPoints ?? 0;
    const reservedPoints = Number(reserved?.points ?? 0);
    return {
      userId,
      points,
      reservedPoints,
      availablePoints: Math.max(0, points - reservedPoints),
      earningRule: 'Tích 5% số tiền thực thanh toán; 1 điểm tương đương 1đ giảm giá',
    };
  }

  async getHistory(userId: string) {
    return this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
