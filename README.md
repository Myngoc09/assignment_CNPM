# BrewLite – Project Tasks

## 1. Giới thiệu

BrewLite là ứng dụng đặt đồ uống trực tuyến, gồm giao diện người dùng, hệ thống xử lý nghiệp vụ và cơ sở dữ liệu.

## 2. Công nghệ sử dụng

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand
- Axios

### Backend
- NestJS
- TypeScript
- TypeORM
- PostgreSQL
- JWT Authentication

### Deployment
- Docker
- Docker Compose

## 3. Cấu trúc dự án

```text
BrewLite/
├── backend/
│   ├── src/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── app/
│   ├── store/
│   ├── public/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

## 4. Cấu hình môi trường

Tạo file `backend/.env` dựa trên các biến môi trường cần thiết:

```env
PORT=3001
DATABASE_URL=postgresql://brewlite:brewlite123@localhost:5432/brewlite

JWT_SECRET=your_jwt_secret

MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=your_email
MAIL_APP_PASSWORD=your_email_app_password

FRONTEND_URL=http://localhost:3000

MOCK_BANK_URL=http://localhost:3002
MOCK_BANK_API_KEY=your_mock_bank_api_key
MOCK_BANK_SECRET=your_mock_bank_secret
MOCK_PAYMENT_RESULT=SUCCESS
```

Không đưa file `.env` chứa thông tin bí mật lên GitHub.

Khi chạy bằng Docker Compose, Backend sẽ sử dụng địa chỉ PostgreSQL và Mock Bank được cấu hình trong `docker-compose.yml`.

## 5. Chạy dự án bằng Docker Compose

### Yêu cầu

- Docker Desktop
- Docker Compose
- Node.js và npm (cần thiết nếu chạy Mock Bank trực tiếp trên máy)

### Bước 1: Khởi động 3 service

Mở Terminal tại thư mục gốc dự án:

```bash
docker compose up -d --build
```

Lệnh này sẽ build image và khởi động:

1. PostgreSQL – cổng 5432.
2. Backend NestJS – cổng 3001.
3. Frontend Next.js – cổng 3000.

### Bước 2: Kiểm tra trạng thái container

```bash
docker compose ps
```

Xem log của các service:

```bash
docker compose logs -f
```

Xem log riêng từng service:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Bước 3: Truy cập ứng dụng

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- PostgreSQL: localhost:5432

### Bước 4: Dừng dự án

```bash
docker compose down
```

Lệnh trên dừng và xóa các container thuộc Compose nhưng giữ lại volume dữ liệu PostgreSQL.

Không sử dụng `docker compose down -v` nếu muốn giữ dữ liệu database.

## 6. Mock Bank

Mock Bank không chạy trong Docker Compose mà chạy riêng trên máy tính tại cổng 3002.

Backend trong Docker kết nối tới Mock Bank thông qua:

```text
http://host.docker.internal:3002
```

Cần khởi động Mock Bank trước khi thực hiện chức năng thanh toán.

## 7. Các chức năng chính

### Task 5 – Giỏ hàng (Cart)

- Thêm sản phẩm vào giỏ hàng.
- Cập nhật số lượng sản phẩm.
- Xóa sản phẩm khỏi giỏ hàng.
- Tính tổng tiền.
- Quản lý trạng thái giỏ hàng.

### Task 6 – PostgreSQL và TypeORM

- Chuyển database từ SQLite sang PostgreSQL.
- Sử dụng TypeORM để quản lý database.
- Chạy PostgreSQL bằng Docker.
- Seed 4 sản phẩm mẫu.
- Xây dựng API sản phẩm và tạo đơn hàng.
- Tính giá theo size và topping.
- Kiểm tra tồn kho khi đặt hàng.
- Trạng thái đơn hàng ban đầu: PENDING.

### Task 7 – Đăng ký và đăng nhập

- Đăng ký tài khoản.
- Đăng nhập.
- Xác thực bằng JWT.
- Quản lý thông tin người dùng.
- Chức năng quên mật khẩu.

### Task 8 – Thanh toán

- Tạo yêu cầu thanh toán.
- Sử dụng Mock Bank để mô phỏng thanh toán.
- Kiểm tra kết quả thanh toán.
- Cập nhật trạng thái thanh toán và đơn hàng.

### Task 9 – Xác nhận đơn hàng và lịch sử đơn hàng

- Hiển thị thông tin xác nhận sau khi thanh toán thành công.
- Hiển thị mã đơn hàng và trạng thái.
- Xây dựng chức năng xem lịch sử đơn hàng của người dùng.
- Sử dụng Docker Compose để khởi chạy Frontend, Backend và PostgreSQL.
- Bổ sung tài liệu README hướng dẫn cài đặt và chạy dự án.

## 8. API chính

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/products` | Lấy danh sách sản phẩm |
| GET | `/products/:id` | Lấy thông tin sản phẩm |
| POST | `/orders` | Tạo đơn hàng |
| GET | `/orders/me` | Xem lịch sử đơn hàng |
| POST | `/payments` | Tạo yêu cầu thanh toán |
| GET | `/payments/:id` | Xem thông tin thanh toán |

Các API yêu cầu xác thực sẽ sử dụng JWT Bearer Token.

## 9. Kiểm thử

Có thể sử dụng trình duyệt để kiểm tra giao diện và Thunder Client để gửi request đến Backend.

Kiểm tra trạng thái các container bằng:

```bash
docker compose ps
```

Kiểm tra log khi xảy ra lỗi:

```bash
docker compose logs backend
docker compose logs frontend
docker compose logs postgres
```