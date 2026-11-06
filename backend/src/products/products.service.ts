
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async onModuleInit() {
    // Chi them san pham neu chua ton tai
    await this.productRepository
      .createQueryBuilder()
      .insert()
      .into(Product)
      .values([
        {
          id: '1',
          name: 'Cà Phê Muối brewlite',
          category: 'Cà Phê',
          rating: 4.8,
          price: 45000,
          imageUrl:
            'https://images.unsplash.com/photo-1541167760496-1628856ab772',
          stock: 100,
        },
        {
          id: '2',
          name: 'Trà Đào Cam Sả',
          category: 'Trà',
          rating: 4.8,
          price: 50000,
          imageUrl:
            'https://images.unsplash.com/photo-1556679343-c7306c1976bc',
          stock: 100,
        },
        {
          id: '3',
          name: 'Bánh Croissant Bơ Tươi',
          category: 'Bánh Ngọt',
          rating: 4.8,
          price: 38000,
          imageUrl:
            'https://images.unsplash.com/photo-1555507036-ab1f4038808a',
          stock: 100,
        },
        {
          id: '4',
          name: 'Matcha Latte Uji',
          category: 'Trà',
          rating: 4.8,
          price: 55000,
          imageUrl:
            'https://images.unsplash.com/photo-1534778101976-62847782c213',
          stock: 100,
        },
      ])
      .orIgnore()
      .execute();

    console.log('Da dong bo 4 san pham vao PostgreSQL!');
  }

  async findAll() {
    return await this.productRepository.find();
  }

  async findOne(id: string) {
    return await this.productRepository.findOne({
      where: { id },
    });
  }
}
