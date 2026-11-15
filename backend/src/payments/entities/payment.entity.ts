
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Order } from '../../orders/entities/order.entity';

export enum PaymentMethod {
  WALLET = 'WALLET',
  CARD = 'CARD',
}

export enum PaymentProvider {
  // Mock Bank nội bộ: thanh toán đồng bộ, có kết quả ngay.
  MOCK = 'MOCK',

  // VNPay Sandbox: thanh toán bất đồng bộ (trả paymentUrl + mã QR,
  // kết quả về qua IPN / Return URL).
  VNPAY = 'VNPAY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}

@Entity('payments')
// Idempotency-Key là duy nhất trong phạm vi từng user (NULL được phép lặp).
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

  // Giá trị header Idempotency-Key client gửi kèm (nếu có).
  // Cùng key + cùng user => trả lại giao dịch cũ, không tạo giao dịch mới.
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  idempotencyKey: string | null;

  // Mã giao dịch do Mock Bank trả về.
  @Column({
    type: 'varchar',
    nullable: true,
  })
  mockTransactionId: string | null;

  // --- Các cột dành cho VNPay (NULL với giao dịch MOCK) ---

  // vnp_TransactionNo: mã giao dịch phía VNPay.
  @Column({
    type: 'varchar',
    nullable: true,
  })
  vnpTransactionNo: string | null;

  // vnp_ResponseCode: '00' = thành công.
  @Column({
    type: 'varchar',
    nullable: true,
  })
  responseCode: string | null;

  // URL thanh toán đã ký; cũng là nội dung của mã QR.
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
