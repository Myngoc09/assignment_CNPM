
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

import { Product } from './entities/product.entity';
import { ProductSizePrice } from './entities/product-size-price.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class AdminProductsService {
  constructor(private readonly dataSource: DataSource) {}

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

    const prices = await this.dataSource
      .getRepository(ProductSizePrice)
      .find();

    return products.map((product) => ({
      ...product,
      prices: prices.filter(
        (item) => item.productId === product.id,
      ),
    }));
  }

  async findOne(id: string) {
    const product = await this.dataSource
      .getRepository(Product)
      .findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const prices = await this.dataSource
      .getRepository(ProductSizePrice)
      .find({ where: { productId: id } });

    return { ...product, prices };
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
