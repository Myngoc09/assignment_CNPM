import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductsService {
  private readonly products = [
    {
      id: '1',
      name: 'Cà phê sữa',
      price: 35000,
      imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772',
    },
    {
      id: '2',
      name: 'Americano',
      price: 40000,
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd',
    },
    {
      id: '3',
      name: 'Cappuccino',
      price: 45000,
      imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213',
    },
    {
      id: '4',
      name: 'Trà đào',
      price: 39000,
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc',
    },
  ];

  findAll() {
    return this.products;
  }
}