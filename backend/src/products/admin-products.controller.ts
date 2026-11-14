
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';

import { AdminProductsService } from './admin-products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SaveProductRecipesDto } from './dto/save-product-recipes.dto';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminProductsController {
  constructor(
    private readonly adminProductsService: AdminProductsService,
  ) {}

  @Get(':id/recipes')
  getRecipes(@Param('id') id: string) {
    return this.adminProductsService.getRecipes(id);
  }

  @Put(':id/recipes')
  saveRecipes(
    @Param('id') id: string,
    @Body() dto: SaveProductRecipesDto,
  ) {
    return this.adminProductsService.saveRecipes(id, dto);
  }

  @Get()
  findAll() {
    return this.adminProductsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminProductsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.adminProductsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.adminProductsService.update(id, dto);
  }
}
