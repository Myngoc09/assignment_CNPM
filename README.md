# BrewLite – Project Tasks

# HƯỚNG DẪN CẬP NHẬT VÀ CHẠY BREWLITE BẰNG DOCKER

## 1. Lấy code mới nhất

Nếu đã clone project trước đó, mở Terminal tại thư mục dự án và chạy:

git pull origin task-10-3-inventory

Nếu chưa có project, clone repository:

git clone -b task-10-3-inventory https://github.com/Myngoc09/assignment_CNPM.git
cd assignment_CNPM

## 2. Chuẩn bị môi trường

- Cài đặt Docker Desktop và mở ứng dụng.
- Chờ Docker Engine khởi động hoàn tất.
- Cài đặt Node.js và npm.
- Tạo file `backend/.env` dựa trên `backend/.env.example`, sau đó cấu hình các biến môi trường cần thiết.

Kiểm tra Docker:

docker info
## 3. Cài đặt thư viện Backend

Mở Terminal tại thư mục gốc dự án và chạy:

cd backend
npm.cmd install
cd ..

Lưu ý: Không cần cài riêng `class-validator` và `class-transformer` nếu hai thư viện này đã có trong `package.json`.

## 4. Khởi tạo database lần đầu

Chạy tại thư mục gốc dự án:

powershell -ExecutionPolicy Bypass -File .\scripts\setup-db.ps1

Script sẽ tự động:
- Khởi động PostgreSQL bằng Docker.
- Kiểm tra database.
- Chạy migration để tạo các bảng.
- Nạp dữ liệu mẫu từ `initial-data.sql`.
- Kiểm tra số lượng dữ liệu sau khi khởi tạo.

Kết quả mong đợi:

- 4 sản phẩm.
- 21 nguyên liệu.
- 62 dòng công thức định lượng nguyên liệu.

Lưu ý:
- Chỉ chạy bước này khi thiết lập database lần đầu.
- Script sẽ dừng nếu database đã có bảng để tránh ghi đè dữ liệu.
- Nếu database đã được khởi tạo trước đó thì bỏ qua bước này.

## 5. Kiểm tra kết nối database

Khởi động PostgreSQL:
docker compose up -d postgres

Kiểm tra container:

docker compose ps

Kiểm tra kết nối:

docker compose exec postgres pg_isready -U brewlite -d brewlite

Nếu hiển thị `accepting connections` nghĩa là PostgreSQL đã sẵn sàng.

Có thể kiểm tra bảng và dữ liệu bằng cách kết nối:

docker compose exec postgres psql -U brewlite -d brewlite

Trong PostgreSQL, chạy:

```sql
\dt
SELECT * FROM products; (chạy từng cái nha)
SELECT * FROM ingredients;
SELECT * FROM product_recipes;
```

Thoát PostgreSQL:\q 

## 6. Build và chạy toàn bộ dự án

Khi database đã sẵn sàng, chạy tại thư mục gốc:

docker compose up -d --build

Kiểm tra trạng thái các container:

docker compose ps

## 7. Những lần chạy tiếp theo

Sau khi đã thiết lập database thành công lần đầu, những lần sau chỉ cần:

docker compose up -d --build

Kiểm tra:

docker compose ps

Không cần chạy lại script khởi tạo database, migration hoặc nạp dữ liệu mẫu.

**Lưu ý quan trọng:**
- Không chạy `docker compose down -v` vì có thể xóa dữ liệu database đã lưu.
- Không chia sẻ file `.env` chứa mật khẩu hoặc thông tin bí mật lên GitHub.
- Nếu gặp lỗi, kiểm tra trạng thái container bằng `docker compose ps` và xem log bằng `docker compose logs backend` hoặc `docker compose logs postgres`.
## 8. Các lỗi thường gặp

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