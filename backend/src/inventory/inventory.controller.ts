
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';

import { AdminInventoryService } from './admin-inventory.service';
import { ImportIngredientDto } from './dto/import-ingredient.dto';
import { AdjustIngredientDto } from './dto/adjust-ingredient.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class InventoryController {
  constructor(
    private readonly adminInventoryService: AdminInventoryService,
  ) {}

  // GET /inventory/ingredients
  @Get('ingredients')
  getIngredients() {
    return this.adminInventoryService.getIngredients();
  }

  // POST /inventory/ingredients/:id/import
  @Post('ingredients/:id/import')
  importIngredient(
    @Param('id', ParseUUIDPipe) ingredientId: string,
    @Body() dto: ImportIngredientDto,
  ) {
    return this.adminInventoryService.importIngredient(
      ingredientId,
      dto,
    );
  }

  // PATCH /inventory/ingredients/:id/adjust
  @Patch('ingredients/:id/adjust')
  adjustIngredient(
    @Param('id', ParseUUIDPipe) ingredientId: string,
    @Body() dto: AdjustIngredientDto,
  ) {
    return this.adminInventoryService.adjustIngredient(
      ingredientId,
      dto,
    );
  }

  // GET /inventory/transactions
  @Get('transactions')
  getTransactions() {
    return this.adminInventoryService.getTransactions();
  }
}
