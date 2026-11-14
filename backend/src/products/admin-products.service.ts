
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { randomUUID } from 'crypto';

import { Product } from './entities/product.entity';
import { ProductSizePrice } from './entities/product-size-price.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Ingredient } from '../inventory/entities/ingredient.entity';
import { ProductRecipe } from '../inventory/entities/product-recipe.entity';
import { SaveProductRecipesDto } from './dto/save-product-recipes.dto';

@Injectable()
export class AdminProductsService {
  constructor(private readonly dataSource: DataSource) {}


  private async attachSellableInventory(products: Product[]) {
    const productIds = products.map((product) => product.id);

    if (productIds.length === 0) {
      return [];
    }

    const [prices, recipes, ingredients] = await Promise.all([
      this.dataSource.getRepository(ProductSizePrice).find({
        where: { productId: In(productIds) },
      }),
      this.dataSource.getRepository(ProductRecipe).find({
        where: { productId: In(productIds) },
      }),
      this.dataSource.getRepository(Ingredient).find(),
    ]);

    const ingredientMap = new Map(
      ingredients.map((ingredient) => [
        ingredient.id,
        Math.max(
          0,
          Number(ingredient.stock) - Number(ingredient.reservedStock),
        ),
      ]),
    );

    return products.map((product) => {
      const productPrices = prices.filter(
        (price) => price.productId === product.id,
      );

      const oneSize = productPrices.some(
        (price) => price.size === 'ONE_SIZE',
      );

      const sellableBySize: Record<string, number> = {};
      const missingRecipeSizes: string[] = [];

      // ONE_SIZE: phân loại theo inventoryMode.
      if (oneSize) {
        if (product.inventoryMode === 'FINISHED_GOOD') {
          // Thành phẩm như Croissant: lấy tồn kho sản phẩm.
          sellableBySize.ONE_SIZE = Number(product.stock);
        } else {
          // Nguyên liệu như Butding: tính theo công thức.
          const sizeRecipes = recipes.filter(
            (recipe) =>
              recipe.productId === product.id &&
              recipe.size === 'ONE_SIZE',
          );

          if (sizeRecipes.length === 0) {
            missingRecipeSizes.push('ONE_SIZE');
          } else {
            const possibleQuantities = sizeRecipes.map((recipe) => {
              const available = ingredientMap.get(recipe.ingredientId);
              const required = Number(recipe.quantity);

              if (
                available === undefined ||
                !Number.isFinite(required) ||
                required <= 0
              ) {
                return null;
              }

              return Math.floor(available / required);
            });

            if (possibleQuantities.some((quantity) => quantity === null)) {
              missingRecipeSizes.push('ONE_SIZE');
            } else {
              sellableBySize.ONE_SIZE = Math.max(
                0,
                Math.min(...(possibleQuantities as number[])),
              );
            }
          }
        }

        return {
          ...product,
          prices: productPrices,
          sellableBySize,
          missingRecipeSizes,
        };
      }

      // Đồ uống S/M/L: tính riêng từng size.
      for (const size of ['S', 'M', 'L']) {
        const sizeRecipes = recipes.filter(
          (recipe) =>
            recipe.productId === product.id &&
            recipe.size === size,
        );

        if (sizeRecipes.length === 0) {
          missingRecipeSizes.push(size);
          continue;
        }

        const possibleQuantities = sizeRecipes.map((recipe) => {
          const available = ingredientMap.get(recipe.ingredientId);
          const required = Number(recipe.quantity);

          if (
            available === undefined ||
            !Number.isFinite(required) ||
            required <= 0
          ) {
            return null;
          }

          return Math.floor(available / required);
        });

        if (possibleQuantities.some((quantity) => quantity === null)) {
          missingRecipeSizes.push(size);
          continue;
        }

        sellableBySize[size] = Math.max(
          0,
          Math.min(...(possibleQuantities as number[])),
        );
      }

      return {
        ...product,
        prices: productPrices,
        sellableBySize,
        missingRecipeSizes,
      };
    });
  }


  private validatePrices(
    prices: { size: string; price: number }[],
  ) {
    if (!Array.isArray(prices) || prices.length === 0) {
      throw new BadRequestException('Sản phẩm phải có ít nhất một mức giá');
    }

    const sizes = prices.map((item) => item.size);

    const validSizes = ['S', 'M', 'L', 'ONE_SIZE'];

    if (sizes.some((size) => !validSizes.includes(size))) {
      throw new BadRequestException('Kích thước không hợp lệ');
    }

    if (new Set(sizes).size !== sizes.length) {
      throw new BadRequestException('Không được trùng kích thước');
    }

    if (
      sizes.includes('ONE_SIZE') &&
      sizes.length !== 1
    ) {
      throw new BadRequestException(
        'ONE_SIZE không được kết hợp với S, M hoặc L',
      );
    }

    for (const item of prices) {
      if (
        !Number.isFinite(item.price) ||
        item.price <= 0
      ) {
        throw new BadRequestException('Giá sản phẩm phải lớn hơn 0');
      }
    }
  }

  async findAll() {
    const products = await this.dataSource
      .getRepository(Product)
      .find({ order: { name: 'ASC' } });

    return this.attachSellableInventory(products);
  }

  async findOne(id: string) {
    const product = await this.dataSource
      .getRepository(Product)
      .findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const [result] = await this.attachSellableInventory([product]);

    return result;
  }

    // Lấy công thức nguyên liệu của một sản phẩm
  async getRecipes(productId: string) {
    const product = await this.dataSource
      .getRepository(Product)
      .findOne({ where: { id: productId } });

    if (!product) {
      throw new NotFoundException('Khong tim thay san pham');
    }

    const recipes = await this.dataSource
      .getRepository(ProductRecipe)
      .find({
        where: { productId },
        relations: { ingredient: true },
        order: { size: 'ASC' },
      });

    return recipes.map((recipe) => ({
      id: recipe.id,
      ingredientId: recipe.ingredientId,
      ingredientName: recipe.ingredient.name,
      unit: recipe.ingredient.unit,
      size: recipe.size,
      quantity: Number(recipe.quantity),
    }));
  }

  // Lưu hoặc cập nhật toàn bộ công thức của một sản phẩm
  async saveRecipes(
    productId: string,
    dto: SaveProductRecipesDto,
  ) {
    const productRepository =
      this.dataSource.getRepository(Product);

    const product = await productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Khong tim thay san pham');
    }

    const priceRepository =
      this.dataSource.getRepository(ProductSizePrice);

    const prices = await priceRepository.find({
      where: { productId },
    });

    const isOneSize = prices.some(
      (price) => price.size === 'ONE_SIZE',
    );

    const allowedSizes = isOneSize
      ? ['ONE_SIZE']
      : ['S', 'M', 'L'];

    if (
      dto.recipes.some(
        (recipe) => !allowedSizes.includes(recipe.size),
      )
    ) {
      throw new BadRequestException(
        'Size cong thuc khong khop voi size san pham',
      );
    }

    // Không cho phép khai báo trùng một nguyên liệu trong cùng size
    const recipeKeys = dto.recipes.map(
      (recipe) => `${recipe.size}:${recipe.ingredientId}`,
    );

    if (new Set(recipeKeys).size !== recipeKeys.length) {
      throw new BadRequestException(
        'Khong duoc trung nguyen lieu trong cung size',
      );
    }

    const ingredientIds = [
      ...new Set(dto.recipes.map((recipe) => recipe.ingredientId)),
    ];

    const ingredients = await this.dataSource
      .getRepository(Ingredient)
      .find({
        where: { id: In(ingredientIds) },
      });

    if (ingredients.length !== ingredientIds.length) {
      throw new BadRequestException(
        'Mot hoac nhieu nguyen lieu khong ton tai',
      );
    }

    // Đồ uống phải có đủ công thức cho cả S, M, L
    if (!isOneSize) {
      for (const size of ['S', 'M', 'L']) {
        if (!dto.recipes.some((recipe) => recipe.size === size)) {
          throw new BadRequestException(
            `Chua co cong thuc cho size ${size}`,
          );
        }
      }
    }

    await this.dataSource.transaction(async (manager) => {
      const recipeRepository =
        manager.getRepository(ProductRecipe);

      await recipeRepository.delete({ productId });

      await recipeRepository.save(
        dto.recipes.map((recipe) =>
          recipeRepository.create({
            productId,
            ingredientId: recipe.ingredientId,
            size: recipe.size,
            quantity: recipe.quantity,
          }),
        ),
      );
    });

    return this.getRecipes(productId);
  }

  async create(dto: CreateProductDto) {
    this.validatePrices(dto.prices);

    if (!dto.name?.trim() || !dto.category?.trim()) {
      throw new BadRequestException(
        'Tên và danh mục sản phẩm không được để trống',
      );
    }

    if (
      dto.stock !== undefined &&
      (!Number.isInteger(dto.stock) || dto.stock < 0)
    ) {
      throw new BadRequestException('Số lượng tồn kho không hợp lệ');
    }

    return this.dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(Product);
      const priceRepository = manager.getRepository(ProductSizePrice);

      const basePrice =
        dto.prices.find((item) => item.size === 'S')?.price ??
        dto.prices[0].price;

      const newProduct = productRepository.create({
        id: randomUUID(),
        name: dto.name.trim(),
        category: dto.category.trim(),
        rating: 0,
        price: basePrice,
        imageUrl: dto.imageUrl,
        stock: dto.stock ?? 100,
        isActive: true,
        });

      const product = await productRepository.save(newProduct);

      await priceRepository.save(
        dto.prices.map((item) => ({
          productId: product.id,
          size: item.size,
          price: item.price,
        })),
      );

      return {
        ...product,
        prices: dto.prices,
      };
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    if (dto.prices !== undefined) {
      this.validatePrices(dto.prices);
    }

    if (
      dto.stock !== undefined &&
      (!Number.isInteger(dto.stock) || dto.stock < 0)
    ) {
      throw new BadRequestException('Số lượng tồn kho không hợp lệ');
    }

    return this.dataSource.transaction(async (manager) => {
      const productRepository = manager.getRepository(Product);
      const priceRepository = manager.getRepository(ProductSizePrice);

      const product = await productRepository.findOne({
        where: { id },
      });

      if (!product) {
        throw new NotFoundException('Không tìm thấy sản phẩm');
      }

      if (dto.name !== undefined) {
        if (!dto.name.trim()) {
          throw new BadRequestException('Tên sản phẩm không được để trống');
        }
        product.name = dto.name.trim();
      }

      if (dto.category !== undefined) {
        if (!dto.category.trim()) {
          throw new BadRequestException('Danh mục không được để trống');
        }
        product.category = dto.category.trim();
      }

      if (dto.imageUrl !== undefined) {
        product.imageUrl = dto.imageUrl;
      }

      if (dto.stock !== undefined) {
        product.stock = dto.stock;
      }

      if (dto.isActive !== undefined) {
        product.isActive = dto.isActive;
      }

      if (dto.prices !== undefined) {
        const basePrice =
          dto.prices.find((item) => item.size === 'S')?.price ??
          dto.prices[0].price;

        product.price = basePrice;
      }

      await productRepository.save(product);

      if (dto.prices !== undefined) {
        await priceRepository.delete({ productId: id });

        await priceRepository.save(
          dto.prices.map((item) => ({
            productId: id,
            size: item.size,
            price: item.price,
          })),
        );
      }

      const prices = await priceRepository.find({
        where: { productId: id },
      });

      return { ...product, prices };
    });
  }
}
