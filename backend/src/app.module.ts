import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Cấu hình CSDL SQLite
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'db.sqlite', // File CSDL tự động tạo ở thư mục gốc backend
      autoLoadEntities: true,
      synchronize: true,     // Tự động tạo/đồng bộ bảng trong CSDL khi chạy server
    } as any), // Dùng 'as any' để bỏ qua kiểm tra union type của TypeScript

    ProductsModule,
    OrdersModule,
  ],
})
export class AppModule {}