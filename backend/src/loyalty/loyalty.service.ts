import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(LoyaltyTransaction)
    private readonly transactionRepository: Repository<LoyaltyTransaction>,
  ) {}

  async getSummary(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, loyaltyPoints: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return {
      userId,
      points: user.loyaltyPoints ?? 0,
      earningRule: '1 điểm cho mỗi 10.000đ thanh toán thành công',
    };
  }

  async getHistory(userId: string) {
    return this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
