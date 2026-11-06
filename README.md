# BrewLite – Project Tasks

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