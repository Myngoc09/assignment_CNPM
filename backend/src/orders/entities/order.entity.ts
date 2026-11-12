import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId?: string;

  // 🛠️ ĐÃ SỬA: Đổi 'simple-enum' thành 'enum' chuẩn cho PostgreSQL
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column('float')
  total: number;

  @Column({ type: 'integer', default: 0 })
  subtotal: number;

  @Column({ type: 'integer', default: 0 })
  discountAmount: number;

  @Column({ type: 'varchar', length: 40, nullable: true })
  promoCode: string | null;

  @Column({ type: 'integer', default: 0 })
  rewardPointsEarned: number;

  @Column({ type: 'timestamptz', nullable: true })
  loyaltyAwardedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];
}