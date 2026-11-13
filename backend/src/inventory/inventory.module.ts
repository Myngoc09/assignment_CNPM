
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { IngredientInventoryService } from './ingredient-inventory.service';
import { AdminInventoryService } from './admin-inventory.service';

import { Ingredient } from './entities/ingredient.entity';
import { ProductRecipe } from './entities/product-recipe.entity';
import { OrderIngredient } from './entities/order-ingredient.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';

import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Ingredient,
      ProductRecipe,
      OrderIngredient,
      InventoryTransaction,
    ]),
  ],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    IngredientInventoryService,
    AdminInventoryService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    InventoryService,
    IngredientInventoryService,
  ],
})
export class InventoryModule {}
