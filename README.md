# BrewLite – Project Tasks

# HƯỚNG DẪN CẬP NHẬT VÀ CHẠY BREWLITE BẰNG DOCKER

## cài thư viện
ở backend : npm.cmd install class-validator class-transformer

## 1. Mở Docker Desktop

Mở ứng dụng Docker Desktop, đợi Docker Engine khởi động hoàn tất.

## 2. Mở Terminal tại thư mục dự án
Kiểm tra Docker: docker info

## 3. Khởi động PostgreSQL bằng Docker
chạy : docker compose up -d postgres
Kiểm tra: docker compose ps

## 4. Kiểm tr[ \t]+$ kết nối database
chạy : docker compose exec postgres pg_isready -U brewlite -d brewlite

Nếu thấy accepting connections là PostgreSQL đã sẵn sàng.

## 5. Kiểm tra database đã có đủ bảng và dữ liệu chưa
Kết nối: docker compose exec postgres psql -U brewlite -d brewlite
Kiểm tra bảng: \dt
Kiểm tra dữ liệu sản phẩm: SELECT * FROM products;
Kiểm tra nguyên liệu: SELECT * FROM ingredients;
Kiểm tra công thức định lượng : SELECT * FROM product_recipes;
4 sản phẩm
21 nguyên liệu
62 dòng công thức định lượng nguyên liệu

## 6. Build và chạy toàn bộ dự án
Khi database đã sẵn sàng: docker compose up -d --build
rồi chạy : docker compose ps
## 7. Các lỗi thường gặp

Docker daemon không hoạt động - > Mở Docker Desktop và đợi Docker Engine khởi động

PostgreSQL chưa chạy -> Chạy docker compose up -d postgres

Không kết nối được database -> Kiểm tra trạng thái PostgreSQL, DATABASE_URL và thông tin đăng nhập

Database chưa tồn tại -> Kiểm tra cấu hình database và thực hiện setup lần đầu

Thiếu bảng hoặc cột -> Kiểm tra và chạy migration hoặc script cập nhật database

Không có dữ liệu sản phẩm -> Kiểm tra và chạy seed data nếu dự án yêu cầu

Backend vẫn sử dụng code cũ -> Chạy docker compose up -d --build backend

Port đã được sử dụng -> Kiểm tra tiến trình đang chiếm port và xử lý trước khi khởi động

Thiếu thư viện -> Chạy npm install trong thư mục frontend hoặc backend tương ứng


## Task 7 – Xác thực người dùng và giỏ hàng theo tài khoản

### Nội dung

- Xác thực trạng thái đăng nhập bằng JWT.
- Kiểm tra quyền đăng nhập trước khi thêm sản phẩm vào giỏ hàng.
- Chuyển đến trang đăng nhập nếu người dùng chưa đăng nhập.
- Tự động thêm sản phẩm vào giỏ hàng sau khi đăng nhập thành công.
- Lưu sản phẩm đã chọn trước khi đăng nhập.
- Quản lý giỏ hàng riêng cho từng tài khoản.
- Lưu giỏ hàng bằng Local Storage.
- Cập nhật thông tin tài khoản người dùng.
- Liên kết đơn hàng với tài khoản người dùng thông qua JWT.

### Công nghệ

- Next.js
- React
- TypeScript
- NestJS
- JWT (JSON Web Token)
- Zustand
- Local Storage
- Tailwind CSS

## Task 6 – PostgreSQL + TypeORM

### Nội dung

- Chuyển database từ SQLite sang PostgreSQL.
- Sử dụng TypeORM để quản lý database.
- Chạy PostgreSQL bằng Docker.
- Seed 4 sản phẩm mẫu.
- Xây dựng API sản phẩm và tạo đơn hàng.
- Tính giá theo size và topping.
- Kiểm tra tồn kho khi đặt hàng.
- Trạng thái đơn hàng ban đầu: PENDING.

### Công nghệ

- NestJS
- TypeScript
- TypeORM
- PostgreSQL 16
- Docker

### Chạy project

```bash
docker compose up -d
cd backend
npm install
npm run start:dev
```

### Backend

http://localhost:3001

### API chính

- `GET /products`
- `GET /products/:id`
- `POST /orders`

### Test

Có thể sử dụng Thunder Client để kiểm tra các API trên.

---

## Task 5 – Giỏ hàng (Cart)

### Nội dung

- Thêm sản phẩm.
- Cập nhật số lượng.
- Xóa sản phẩm.
- Tính tổng tiền.
- Quản lý trạng thái giỏ hàng.
- Hiển thị số lượng sản phẩm.

### Công nghệ

- Next.js
- React
- TypeScript
- Tailwind CSS
- JavaScript