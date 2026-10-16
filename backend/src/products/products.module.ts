import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity'; // Đường dẫn đến file entity Product của bạn

@Module({
  imports: [
    // 🔴 Dòng quan trọng cần thêm vào để NestJS tạo Repository cho Product
    TypeOrmModule.forFeature([Product]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}