
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { Ingredient } from './entities/ingredient.entity';
import { ProductRecipe } from './entities/product-recipe.entity';
import {
  OrderIngredient,
  ReservationStatus,
} from './entities/order-ingredient.entity';
import {
  InventoryTransaction,
  InventoryTransactionType,
} from './entities/inventory-transaction.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

@Injectable()
export class IngredientInventoryService {
  // Giu nguyen lieu cho don hang
  async reserveIngredients(
    manager: EntityManager,
    orderId: string,
    items: OrderItem[],
  ): Promise<void> {
    if (!items || items.length === 0) {
      throw new BadRequestException('Don hang khong co san pham');
    }

    const recipeRepository = manager.getRepository(ProductRecipe);
    const ingredientRepository = manager.getRepository(Ingredient);
    const orderIngredientRepository =
      manager.getRepository(OrderIngredient);
    const transactionRepository =
      manager.getRepository(InventoryTransaction);

    const requiredIngredients = new Map<string, number>();

    // Lay nguyen lieu theo cong thuc tung san pham
    for (const item of items) {
      const recipes = await recipeRepository.find({
        where: {
          productId: item.productId,
          size: item.size,
        },
      });

      const selectedRecipes =
        recipes.length > 0
          ? recipes
          : await recipeRepository.find({
              where: {
                productId: item.productId,
                size: 'ONE_SIZE',
              },
            });

      if (selectedRecipes.length === 0) {
        throw new BadRequestException(
          `Chua co cong thuc nguyen lieu cho san pham ${item.productId}, size ${item.size}`,
        );
      }

      for (const recipe of selectedRecipes) {
        const requiredQuantity = recipe.quantity * item.qty;

        requiredIngredients.set(
          recipe.ingredientId,
          (requiredIngredients.get(recipe.ingredientId) || 0) +
            requiredQuantity,
        );
      }
    }

    // Kiem tra don hang da duoc giu nguyen lieu chua
    const existingReservations = await orderIngredientRepository.find({
      where: { orderId },
    });

    if (
      existingReservations.some(
        (reservation) =>
          reservation.status === ReservationStatus.CONSUMED,
      )
    ) {
      throw new ConflictException(
        'Nguyen lieu cua don hang da duoc su dung',
      );
    }

    if (
      existingReservations.length > 0 &&
      existingReservations.every(
        (reservation) =>
          reservation.status === ReservationStatus.RESERVED,
      )
    ) {
      return;
    }

    // Khoa nguyen lieu theo thu tu ID
    const ingredientIds = [...requiredIngredients.keys()].sort();

    const lockedIngredients = new Map<string, Ingredient>();

    for (const ingredientId of ingredientIds) {
      const ingredient = await ingredientRepository.findOne({
        where: { id: ingredientId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!ingredient) {
        throw new NotFoundException(
          `Khong tim thay nguyen lieu ${ingredientId}`,
        );
      }

      const quantity = requiredIngredients.get(ingredientId)!;
      const availableStock =
        ingredient.stock - ingredient.reservedStock;

      if (availableStock < quantity) {
        throw new BadRequestException(
          `Khong du ${ingredient.name}. Con lai: ${availableStock} ${ingredient.unit}, can: ${quantity} ${ingredient.unit}`,
        );
      }

      lockedIngredients.set(ingredientId, ingredient);
    }

    // Tang so luong dang duoc giu va ghi lich su RESERVE
    for (const [ingredientId, quantity] of requiredIngredients) {
      const ingredient = lockedIngredients.get(ingredientId)!;

      const stockBefore = ingredient.stock;

      ingredient.reservedStock += quantity;

      await ingredientRepository.save(ingredient);

      await transactionRepository.save(
        transactionRepository.create({
          ingredientId,
          orderId,
          type: InventoryTransactionType.RESERVE,
          quantity,
          stockBefore,
          stockAfter: ingredient.stock,
          note: 'Giu nguyen lieu cho don hang',
        }),
      );
    }

    // Luu chi tiet nguyen lieu cua don hang
    for (const [ingredientId, quantity] of requiredIngredients) {
      const existing = existingReservations.find(
        (reservation) => reservation.ingredientId === ingredientId,
      );

      const reservation = existing
        ? existing
        : orderIngredientRepository.create({
            orderId,
            ingredientId,
          });

      reservation.quantity = quantity;
      reservation.status = ReservationStatus.RESERVED;

      await orderIngredientRepository.save(reservation);
    }
  }

  // Xac nhan nguyen lieu da duoc su dung
  async consumeIngredients(
    manager: EntityManager,
    orderId: string,
  ): Promise<void> {
    const orderIngredientRepository =
      manager.getRepository(OrderIngredient);
    const ingredientRepository = manager.getRepository(Ingredient);
    const transactionRepository =
      manager.getRepository(InventoryTransaction);

    const reservations = await orderIngredientRepository.find({
      where: {
        orderId,
        status: ReservationStatus.RESERVED,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (reservations.length === 0) {
      return;
    }

    const ingredientIds = reservations
      .map((reservation) => reservation.ingredientId)
      .sort();

    const lockedIngredients = new Map<string, Ingredient>();

    for (const ingredientId of ingredientIds) {
      const ingredient = await ingredientRepository.findOne({
        where: { id: ingredientId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!ingredient) {
        throw new NotFoundException(
          `Khong tim thay nguyen lieu ${ingredientId}`,
        );
      }

      lockedIngredients.set(ingredientId, ingredient);
    }

    for (const reservation of reservations) {
      const ingredient = lockedIngredients.get(
        reservation.ingredientId,
      )!;

      if (
        ingredient.stock < reservation.quantity ||
        ingredient.reservedStock < reservation.quantity
      ) {
        throw new ConflictException(
          `So luong nguyen lieu ${ingredient.name} khong hop le`,
        );
      }

      const stockBefore = ingredient.stock;

      ingredient.stock -= reservation.quantity;
      ingredient.reservedStock -= reservation.quantity;

      reservation.status = ReservationStatus.CONSUMED;

      await ingredientRepository.save(ingredient);
      await orderIngredientRepository.save(reservation);

      // Ghi lich su SALE
      await transactionRepository.save(
        transactionRepository.create({
          ingredientId: ingredient.id,
          orderId,
          type: InventoryTransactionType.SALE,
          quantity: reservation.quantity,
          stockBefore,
          stockAfter: ingredient.stock,
          note: 'Tru nguyen lieu khi thanh toan thanh cong',
        }),
      );
    }
  }

  // Giai phong nguyen lieu khi don hang that bai hoac bi huy
  async releaseIngredients(
    manager: EntityManager,
    orderId: string,
  ): Promise<void> {
    const orderIngredientRepository =
      manager.getRepository(OrderIngredient);
    const ingredientRepository = manager.getRepository(Ingredient);
    const transactionRepository =
      manager.getRepository(InventoryTransaction);

    const reservations = await orderIngredientRepository.find({
      where: {
        orderId,
        status: ReservationStatus.RESERVED,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (reservations.length === 0) {
      return;
    }

    const ingredientIds = reservations
      .map((reservation) => reservation.ingredientId)
      .sort();

    const lockedIngredients = new Map<string, Ingredient>();

    for (const ingredientId of ingredientIds) {
      const ingredient = await ingredientRepository.findOne({
        where: { id: ingredientId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!ingredient) {
        throw new NotFoundException(
          `Khong tim thay nguyen lieu ${ingredientId}`,
        );
      }

      lockedIngredients.set(ingredientId, ingredient);
    }

    for (const reservation of reservations) {
      const ingredient = lockedIngredients.get(
        reservation.ingredientId,
      )!;

      if (ingredient.reservedStock < reservation.quantity) {
        throw new ConflictException(
          `So luong nguyen lieu dang giu cua ${ingredient.name} khong hop le`,
        );
      }

      const stockBefore = ingredient.stock;

      ingredient.reservedStock -= reservation.quantity;
      reservation.status = ReservationStatus.RELEASED;

      await ingredientRepository.save(ingredient);
      await orderIngredientRepository.save(reservation);

      // Ghi lich su RELEASE
      await transactionRepository.save(
        transactionRepository.create({
          ingredientId: ingredient.id,
          orderId,
          type: InventoryTransactionType.RELEASE,
          quantity: reservation.quantity,
          stockBefore,
          stockAfter: ingredient.stock,
          note: 'Giai phong nguyen lieu khi don hang that bai hoac bi huy',
        }),
      );
    }
  }
}
