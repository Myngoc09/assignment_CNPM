import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Bật CORS để Frontend Next.js (thường chạy port 3000) gọi được sang Backend NestJS
  app.enableCors();

  // 2. Kích hoạt ValidationPipe toàn cục (CỰC KỲ QUAN TRỌNG CHO TASK 6)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động loại bỏ các field không khai báo trong DTO
      forbidNonWhitelisted: true, // Trả lỗi 400 Bad Request nếu client gửi các field "lạ"
      transform: true, // Tự động ép kiểu dữ liệu sang DTO class tương ứng
    }),
  );

  // 3. Lắng nghe port
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();