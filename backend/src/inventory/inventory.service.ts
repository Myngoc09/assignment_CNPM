
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class InventoryService {
  async decreaseStock(
    manager: EntityManager,
    items: Array<{
      productId: string;
      quantity: number;
    }>,
  ): Promise<void> {
    if (!items || items.length === 0) {
      throw new BadRequestException('Danh sách sản phẩm không được để trống');
    }

    // Kiem tra so luong va gom cac san pham trung nhau
    const quantityMap = new Map<string, number>();

    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException(
          'So luong san pham phai la so nguyen duong',
        );
      }

      const currentQuantity = quantityMap.get(item.productId) ?? 0;
      quantityMap.set(item.productId, currentQuantity + item.quantity);
    }

    const productIds = Array.from(quantityMap.keys());
    const productRepository = manager.getRepository(Product);

    // Doc ton kho trong transaction hien tai
    const products = await productRepository.findBy({
      id: In(productIds),
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    // Kiem tra san pham ton tai va du ton kho
    for (const [productId, quantity] of quantityMap) {
      const product = productMap.get(productId);

      if (!product) {
        throw new NotFoundException(
          `Khong tim thay san pham co ID: ${productId}`,
        );
      }

      if (product.stock < quantity) {
        throw new BadRequestException(
          `"${product.name}" chi con ${product.stock} san pham`,
        );
      }
    }

    // Tru ton kho bang optimistic locking
    for (const [productId, quantity] of quantityMap) {
      const product = productMap.get(productId)!;

      const result = await manager.query(
        `
          UPDATE "products"
          SET
            "stock" = "stock" - $1,
            "version" = "version" + 1
          WHERE
            "id" = $2
            AND "stock" >= $1
            AND "version" = $3
          RETURNING "id"
        `,
        [quantity, productId, product.version],
      );

      if (result.length === 0) {
        const latestProduct = await productRepository.findOne({
          where: { id: productId },
        });

        if (!latestProduct) {
          throw new NotFoundException(
            `Khong tim thay san pham co ID: ${productId}`,
          );
        }

        if (latestProduct.stock < quantity) {
          throw new BadRequestException(
            `"${latestProduct.name}" khong du ton kho`,
          );
        }

        throw new ConflictException(
          `Ton kho cua "${latestProduct.name}" vua thay doi. Vui long thu lai`,
        );
      }
    }
  }
}
