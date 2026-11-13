
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
      throw new BadRequestException(
        'Danh sách sản phẩm không được để trống',
      );
    }

    // Kiểm tra số lượng và gom các sản phẩm trùng nhau
    const quantityMap = new Map<string, number>();

    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException(
          'Số lượng sản phẩm phải là số nguyên dương',
        );
      }

      const currentQuantity = quantityMap.get(item.productId) ?? 0;
      quantityMap.set(item.productId, currentQuantity + item.quantity);
    }

    const productIds = Array.from(quantityMap.keys());
    const productRepository = manager.getRepository(Product);

    // Đọc tồn kho trong transaction hiện tại
    const products = await productRepository.findBy({
      id: In(productIds),
    });

    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );

    // Kiểm tra sản phẩm tồn tại và đủ tồn kho
    for (const [productId, quantity] of quantityMap) {
      const product = productMap.get(productId);

      if (!product) {
        throw new NotFoundException(
          `Không tìm thấy sản phẩm có ID: ${productId}`,
        );
      }

      if (product.stock < quantity) {
        throw new BadRequestException(
          `"${product.name}" chỉ còn ${product.stock} sản phẩm`,
        );
      }
    }

    // Trừ tồn kho bằng optimistic locking
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
            `Không tìm thấy sản phẩm có ID: ${productId}`,
          );
        }

        if (latestProduct.stock < quantity) {
          throw new BadRequestException(
            `"${latestProduct.name}" không đủ tồn kho`,
          );
        }

        throw new ConflictException(
          `Tồn kho của "${latestProduct.name}" vừa thay đổi. Vui lòng thử lại`,
        );
      }
    }
  }
}
