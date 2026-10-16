import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductsService {
  private readonly products = [
    {
      id: '1',
      name: 'Cà Phê Muối brewlite',
      category: 'Cà Phê',
      rating: 4.8,
      price: 45000,
      imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772',
    },
    {
      id: '2',
      name: 'Trà Đào Cam Sả',
      category: 'Trà',
      rating: 4.8,
      price: 50000,
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc',
    },
    {
      id: '3',
      name: 'Bánh Croissant Bơ Tươi',
      category: 'Bánh Ngọt',
      rating: 4.8,
      price: 38000,
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a',
    },
    {
      id: '4',
      name: 'Matcha Latte Uji',
      category: 'Trà',
      rating: 4.8,
      price: 55000,
      imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213',
    },
  ];

  findAll() {
    return this.products;
  }
}