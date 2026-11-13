
import 'dotenv/config';

import { DataSource } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';

import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

import { Payment } from '../payments/entities/payment.entity';

import { Ingredient } from '../inventory/entities/ingredient.entity';
import { ProductRecipe } from '../inventory/entities/product-recipe.entity';
import { ProductSizePrice } from '../products/entities/product-size-price.entity';
import { OrderIngredient } from '../inventory/entities/order-ingredient.entity';
import { InventoryTransaction } from '../inventory/entities/inventory-transaction.entity';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Thieu DATABASE_URL trong file .env');
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,

  entities: [
    User,
    Product,
    Order,
    OrderItem,
    Payment,
    Ingredient,
    ProductRecipe,
    OrderIngredient,
    InventoryTransaction,
    ProductSizePrice,
  ],

  migrations: [__dirname + '/migrations/*{.ts,.js}'],

  migrationsTableName: 'migrations',

  synchronize: false,
});
