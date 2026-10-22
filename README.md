# Task 6 – PostgreSQL + TypeORM

# Nội dung

Chuyển database từ SQLite sang PostgreSQL.

Sử dụng TypeORM để quản lý database.

Chạy PostgreSQL bằng Docker.

Seed 4 sản phẩm mẫu.

Xây dựng API sản phẩm và tạo đơn hàng.

Tính giá theo size và topping.

Kiểm tra tồn kho khi đặt hàng.

Trạng thái đơn hàng ban đầu: PENDING.

# Công nghệ

NestJS

TypeScript

TypeORM

PostgreSQL 16

Docker

# Chạy project

docker compose up -d
cd backend
npm install
npm run start:dev

# Backend:

http://localhost:3001

# API chính

GET  /products
GET  /products/:id
POST /orders

# Test

Có thể sử dụng Thunder Client để kiểm tra các API trên.
