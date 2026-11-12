import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum LoyaltyTransactionType {
  EARN = 'EARN',
  REDEEM = 'REDEEM',
}

@Entity('loyalty_transactions')
@Index(['orderId', 'type'], { unique: true })
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'integer' })
  points: number;

  @Column({ type: 'enum', enum: LoyaltyTransactionType })
  type: LoyaltyTransactionType;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
