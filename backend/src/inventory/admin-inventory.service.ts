
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { Ingredient } from './entities/ingredient.entity';
import {
  InventoryTransaction,
  InventoryTransactionType,
} from './entities/inventory-transaction.entity';
import { ImportIngredientDto } from './dto/import-ingredient.dto';
import { AdjustIngredientDto } from './dto/adjust-ingredient.dto';

@Injectable()
export class AdminInventoryService {
  constructor(private readonly dataSource: DataSource) {}

  // Lay danh sach nguyen lieu
  async getIngredients() {
    const ingredients = await this.dataSource
      .getRepository(Ingredient)
      .find({
        order: { name: 'ASC' },
      });

    return ingredients.map((ingredient) => ({
      ...ingredient,
      availableStock:
        ingredient.stock - ingredient.reservedStock,
    }));
  }

  // Nhap them nguyen lieu
  async importIngredient(
    ingredientId: string,
    dto: ImportIngredientDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const ingredientRepository =
        manager.getRepository(Ingredient);
      const transactionRepository =
        manager.getRepository(InventoryTransaction);

      const ingredient = await ingredientRepository.findOne({
        where: { id: ingredientId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!ingredient) {
        throw new NotFoundException('Khong tim thay nguyen lieu');
      }

      const stockBefore = ingredient.stock;

      ingredient.stock += dto.quantity;

      await ingredientRepository.save(ingredient);

      await transactionRepository.save(
        transactionRepository.create({
          ingredientId,
          type: InventoryTransactionType.IMPORT,
          quantity: dto.quantity,
          stockBefore,
          stockAfter: ingredient.stock,
          note: dto.note ?? 'Nhap them nguyen lieu',
        }),
      );

      return {
        message: 'Nhap kho thanh cong',
        ingredientId,
        stockBefore,
        stockAfter: ingredient.stock,
        reservedStock: ingredient.reservedStock,
        availableStock:
          ingredient.stock - ingredient.reservedStock,
      };
    });
  }

  // Dieu chinh tong ton kho
  async adjustIngredient(
    ingredientId: string,
    dto: AdjustIngredientDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const ingredientRepository =
        manager.getRepository(Ingredient);
      const transactionRepository =
        manager.getRepository(InventoryTransaction);

      const ingredient = await ingredientRepository.findOne({
        where: { id: ingredientId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!ingredient) {
        throw new NotFoundException('Khong tim thay nguyen lieu');
      }

      // Khong cho phep ton kho thap hon so luong dang giu
      if (dto.newStock < ingredient.reservedStock) {
        throw new BadRequestException(
          `Ton kho moi khong duoc thap hon so luong dang giu (${ingredient.reservedStock} ${ingredient.unit})`,
        );
      }

      const stockBefore = ingredient.stock;
      const quantity = Math.abs(dto.newStock - stockBefore);

      if (quantity === 0) {
        throw new BadRequestException(
          'Ton kho moi phai khac ton kho hien tai',
        );
      }

      ingredient.stock = dto.newStock;

      await ingredientRepository.save(ingredient);

      await transactionRepository.save(
        transactionRepository.create({
          ingredientId,
          type: InventoryTransactionType.ADJUSTMENT,
          quantity,
          stockBefore,
          stockAfter: ingredient.stock,
          note: dto.note ?? 'Dieu chinh ton kho',
        }),
      );

      return {
        message: 'Dieu chinh ton kho thanh cong',
        ingredientId,
        stockBefore,
        stockAfter: ingredient.stock,
        reservedStock: ingredient.reservedStock,
        availableStock:
          ingredient.stock - ingredient.reservedStock,
      };
    });
  }

    // Lay 100 giao dich kho moi nhat
  async getTransactions() {
    return this.dataSource
      .getRepository(InventoryTransaction)
      .find({
        relations: {
          ingredient: true,
        },
        order: {
          createdAt: 'DESC',
        },
        take: 100,
      });
  }
  
}
