import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('float')
  price: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: 100 })
  stock: number;
  
  @Column({ nullable: true })
  category: string;
}