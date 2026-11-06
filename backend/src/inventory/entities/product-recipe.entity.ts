import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Ingredient } from './ingredient.entity';

@Entity('product_recipes')
@Unique(['productId', 'ingredientId', 'size'])
export class ProductRecipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  productId: string;

  @Column('uuid')
  ingredientId: string;

  // S, M, L hoac ONE_SIZE
  @Column({ type: 'varchar', default: 'M' })
  size: string;

  // Dinh luong nguyen lieu cho 1 san pham
  @Column('double precision')
  quantity: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => Ingredient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ingredientId' })
  ingredient: Ingredient;
}