import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

import { Ingredient } from './ingredient.entity';
import { Order } from '../../orders/entities/order.entity';

export enum InventoryTransactionType {
  RESERVE = 'RESERVE',
  SALE = 'SALE',
  RELEASE = 'RELEASE',
  IMPORT = 'IMPORT',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('inventory_transactions')
@Index(['orderId'])
@Index(['ingredientId'])
export class InventoryTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  ingredientId: string;

  @Column('uuid', { nullable: true })
  orderId: string | null;

  @Column({
    type: 'enum',
    enum: InventoryTransactionType,
  })
  type: InventoryTransactionType;

  // So luong nguyen lieu giao dich, luon la so duong
  @Column('double precision')
  quantity: number;

  // Ton kho thuc te truoc va sau giao dich
  @Column('double precision')
  stockBefore: number;

  @Column('double precision')
  stockAfter: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Ingredient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ingredientId' })
  ingredient: Ingredient;

  @ManyToOne(() => Order, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'orderId' })
  order: Order | null;
}