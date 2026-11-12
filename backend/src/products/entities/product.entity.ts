import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column('float')
  rating: number;

  @Column('float')
  price: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: 100 })
  stock: number;

  // Incremented explicitly by the optimistic-lock stock update query.
  @Column({ type: 'integer', default: 1 })
  version: number;
}
