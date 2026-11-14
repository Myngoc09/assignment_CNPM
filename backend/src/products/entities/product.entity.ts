
import {
  Entity,
  PrimaryColumn,
  Column,
  VersionColumn,
} from 'typeorm';

export type ProductInventoryMode =
  | 'INGREDIENT'
  | 'FINISHED_GOOD';

@Entity('products')
export class Product {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @VersionColumn()
  version: number;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column('float')
  rating: number;

  @Column('float')
  price: number;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ default: 100 })
  stock: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'INGREDIENT',
  })
  inventoryMode: ProductInventoryMode;

  @Column({ default: true })
  isActive: boolean;
}
