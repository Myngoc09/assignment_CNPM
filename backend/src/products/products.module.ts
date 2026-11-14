
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from './entities/product.entity';
import { ProductSizePrice } from './entities/product-size-price.entity';

import { ProductsController } from './products.controller';
import { AdminProductsController } from './admin-products.controller';

import { ProductsService } from './products.service';
import { AdminProductsService } from './admin-products.service';

import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Ingredient } from '../inventory/entities/ingredient.entity';
import { ProductRecipe } from '../inventory/entities/product-recipe.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductSizePrice, Ingredient, ProductRecipe]),
    AuthModule,
  ],
  controllers: [
    ProductsController,
    AdminProductsController,
  ],
  providers: [
    ProductsService,
    AdminProductsService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
