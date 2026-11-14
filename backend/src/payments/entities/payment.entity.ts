
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { Order } from '../../orders/entities/order.entity';

export enum PaymentMethod {
  WALLET = 'WALLET',
  CARD = 'CARD',
}

export enum PaymentProvider {
  MOCK = 'MOCK',

  // Giữ giá trị cũ để tránh thay đổi enum PostgreSQL
  // trong quá trình đồng bộ database.
  // Không còn sử dụng VNPay trong luồng thanh toán.
  VNPAY = 'VNPAY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}

@Entity('payments')
@Index(['userId', 'idempotencyKey'], { unique: true })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'integer' })
  amount: number;

  // Nullable to preserve legacy Task 8 payment rows.
  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotencyKey: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  requestHash: string | null;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  method: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
    default: PaymentProvider.MOCK,
  })
  provider: PaymentProvider;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  // Mã tham chiếu do Backend BrewLite tạo.
  @Column({ unique: true })
  txnRef: string;

  // Mã giao dịch do Mock Bank trả về.
  @Column({
    type: 'varchar',
    nullable: true,
  })
  mockTransactionId: string | null;

  // Các cột cũ được giữ lại để tránh thay đổi schema đột ngột.
  // Không sử dụng trong luồng Mock Bank.
  @Column({
    type: 'varchar',
    nullable: true,
  })
  vnpTransactionNo: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  responseCode: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  paymentUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Order, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order: Order;
}
