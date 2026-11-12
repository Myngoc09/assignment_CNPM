import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromoCode, PromotionType } from './entities/promo-code.entity';

@Injectable()
export class PromotionsService implements OnModuleInit {
  constructor(
    @InjectRepository(PromoCode)
    private readonly promoRepository: Repository<PromoCode>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Mã demo để nhóm có thể kiểm thử ngay sau khi khởi động.
    const existing = await this.promoRepository.findOne({
      where: { code: 'BREWLITE10' },
    });
    if (!existing) {
      await this.promoRepository.save(
        this.promoRepository.create({
          code: 'BREWLITE10',
          type: PromotionType.PERCENT,
          value: 10,
          minOrderAmount: 30000,
          maxDiscountAmount: 20000,
          usageLimit: null,
          usedCount: 0,
          startsAt: null,
          endsAt: null,
          isActive: true,
        }),
      );
    }
  }

  async listActive() {
    const now = new Date();
    const promotions = await this.promoRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
    return promotions
      .filter((promo) =>
        (!promo.startsAt || promo.startsAt <= now) &&
        (!promo.endsAt || promo.endsAt >= now) &&
        (promo.usageLimit === null || promo.usedCount < promo.usageLimit),
      )
      .map((promo) => ({
        code: promo.code,
        type: promo.type,
        value: promo.value,
        minOrderAmount: promo.minOrderAmount,
        maxDiscountAmount: promo.maxDiscountAmount,
        endsAt: promo.endsAt,
      }));
  }

  async validate(code: string, subtotal: number) {
    const normalizedCode = code.trim().toUpperCase();
    const promo = await this.promoRepository.findOne({
      where: { code: normalizedCode },
    });
    if (!promo) {
      throw new BadRequestException('Mã khuyến mãi không tồn tại');
    }
    this.assertUsable(promo, subtotal);
    return {
      code: promo.code,
      subtotal,
      discountAmount: this.calculateDiscount(promo, subtotal),
      total: subtotal - this.calculateDiscount(promo, subtotal),
    };
  }

  assertUsable(promo: PromoCode, subtotal: number): void {
    const now = new Date();
    if (!promo.isActive) {
      throw new BadRequestException('Mã khuyến mãi đã bị vô hiệu hóa');
    }
    if (promo.startsAt && promo.startsAt > now) {
      throw new BadRequestException('Mã khuyến mãi chưa bắt đầu');
    }
    if (promo.endsAt && promo.endsAt < now) {
      throw new BadRequestException('Mã khuyến mãi đã hết hạn');
    }
    if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
      throw new BadRequestException('Mã khuyến mãi đã hết lượt sử dụng');
    }
    if (subtotal < promo.minOrderAmount) {
      throw new BadRequestException(
        `Đơn hàng tối thiểu ${promo.minOrderAmount.toLocaleString('vi-VN')}đ để sử dụng mã này`,
      );
    }
  }

  calculateDiscount(promo: PromoCode, subtotal: number): number {
    const rawDiscount =
      promo.type === PromotionType.PERCENT
        ? Math.floor((subtotal * promo.value) / 100)
        : promo.value;
    const cappedDiscount =
      promo.maxDiscountAmount === null
        ? rawDiscount
        : Math.min(rawDiscount, promo.maxDiscountAmount);
    return Math.max(0, Math.min(subtotal, cappedDiscount));
  }
}
