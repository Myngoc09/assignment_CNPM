
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
} from 'typeorm';

@Entity('product_size_prices')
@Unique('UQ_product_size_prices_product_size', ['productId', 'size'])
export class ProductSizePrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  productId: string;

  @Column({ type: 'varchar' })
  size: string;

  @Column('float')
  price: number;
}
