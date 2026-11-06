import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InventoryService } from './inventory.service';
import { IngredientInventoryService } from './ingredient-inventory.service';

import { Ingredient } from './entities/ingredient.entity';
import { ProductRecipe } from './entities/product-recipe.entity';
import { OrderIngredient } from './entities/order-ingredient.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Ingredient,
      ProductRecipe,
      OrderIngredient,
      InventoryTransaction,
    ]),
  ],
  providers: [
    InventoryService,
    IngredientInventoryService,
  ],
  exports: [
    InventoryService,
    IngredientInventoryService,
  ],
})
export class InventoryModule {}