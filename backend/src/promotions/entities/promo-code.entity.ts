import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum PromotionType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

@Entity('promo_codes')
export class PromoCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 40 })
  code: string;

  @Column({ type: 'enum', enum: PromotionType })
  type: PromotionType;

  // PERCENT: percentage (e.g. 10); FIXED: VND amount.
  @Column({ type: 'integer' })
  value: number;

  @Column({ type: 'integer', default: 0 })
  minOrderAmount: number;

  @Column({ type: 'integer', nullable: true })
  maxDiscountAmount: number | null;

  @Column({ type: 'integer', nullable: true })
  usageLimit: number | null;

  @Column({ type: 'integer', default: 0 })
  usedCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
