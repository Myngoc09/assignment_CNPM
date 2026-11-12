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
## Task 10. 
## Trạng thái và chuyển tiếp

Luồng chính:

```text
PENDING -> PAID -> PREPARING -> READY -> COMPLETED
```

Các nhánh khác:

```text
PENDING -> PAYMENT_FAILED -> PENDING  (thử thanh toán lại)
PENDING, PAID, PAYMENT_FAILED -> CANCELLED
```
## 1. Chạy unit test

Mở terminal ở thư mục `backend`:

```powershell
npm install
npm test -- --runInBand --runTestsByPath src/orders/services/order-state-machine.service.spec.ts
```

Kết quả mong đợi:

```text
Test Suites: 1 passed
Tests:       5 passed
```
## 2. Khởi động các dịch vụ để thử API

Từ thư mục gốc project:

```powershell
docker compose up -d
```

Lệnh này khởi động PostgreSQL, backend và frontend. Mock Bank chạy riêng trong terminal khác:

```powershell
cd mock-bank
npm install
npm run start:dev
```

Mock Bank cần lắng nghe ở `http://localhost:3002`. Giá trị `MOCK_BANK_API_KEY` trong backend và Mock Bank phải khớp nhau. Backend cần có `MOCK_BANK_URL` trỏ tới Mock Bank; khi backend chạy trong Docker Compose, cấu hình mẫu là `http://host.docker.internal:3002`.

## 3. Tạo đơn hàng

Trong Thunder Client, Postman hoặc công cụ HTTP tương đương:

1. Đăng nhập tại `POST http://localhost:3001/auth/login` bằng email và mật khẩu tài khoản đã đăng ký. Sao chép JWT trong phản hồi.
2. Gọi `GET http://localhost:3001/products` và sao chép `id` của một sản phẩm.
3. Gọi `POST http://localhost:3001/orders`, chọn **Auth → Bearer** và dán JWT. Chọn **Body → JSON** rồi gửi:

   ```json
   {
     "items": [
       {
         "productId": "ID_SAN_PHAM",
         "size": "M",
         "qty": 1,
         "toppings": []
       }
     ]
   }
   ```

   Thay `ID_SAN_PHAM` bằng ID thật. Đơn mới được tạo với trạng thái `PENDING`; ghi lại `orderId` trong phản hồi.

## 4. Thử thanh toán thành công

Gọi `POST http://localhost:3001/payments`, dùng cùng JWT Bearer token và header `Idempotency-Key` duy nhất cho lần thanh toán:

```http
Authorization: Bearer <JWT>
Idempotency-Key: checkout-demo-0001
Content-Type: application/json
```

```json
{
  "orderId": "ID_DON_HANG",
  "method": "WALLET",
  "provider": "MOCK"
}
```

`method` nhận `WALLET` hoặc `CARD`. Thay `ID_DON_HANG` bằng `orderId` thật. Gửi lại đúng payload với đúng `Idempotency-Key` sẽ nhận lại giao dịch cũ; dùng cùng key cho payload khác sẽ bị từ chối HTTP 409. Sau đó gọi `GET http://localhost:3001/orders/me` với token để xem trạng thái.


## Task 10 – nghiệp vụ backend

Các endpoint bổ sung:

- `GET /promotions` – danh sách mã đang hoạt động.
- `POST /promotions/validate` – kiểm tra mã với `code` và `subtotal`.
- `GET /loyalty/me` – số dư điểm; `GET /loyalty/me/transactions` – lịch sử tích điểm.


- `POST /orders` nhận `promoCode` tùy chọn, kiểm tra mã giảm giá và trừ tồn kho trong transaction. Mỗi sản phẩm có `version`; câu lệnh cập nhật chỉ thành công khi version và tồn kho vẫn đúng (optimistic locking).
- `POST /payments` yêu cầu header `Idempotency-Key` (8–128 ký tự). Gửi lại cùng key và cùng payload sẽ dùng lại giao dịch đã tạo; dùng lại key cho payload khác trả HTTP 409.
- Mock Bank nhận cùng `Idempotency-Key` và phát lại cùng kết quả giao dịch khi request được gửi lại. Bộ nhớ idempotency của Mock Bank là in-memory, sẽ mất khi khởi động lại service; backend vẫn lưu key và payment trong PostgreSQL.
- Khi thanh toán thành công, order chuyển `PAID` và cộng `floor(amount / 10000)` điểm một lần; lịch sử tại `GET /loyalty/me/transactions`, số dư tại `GET /loyalty/me`.
- Mã khuyến mãi demo được tạo khi backend khởi động: `BREWLITE10` (giảm 10%, đơn tối thiểu 30.000đ, giảm tối đa 20.000đ).
- Đây là thanh toán mô phỏng. Mock Bank không chuyển tiền thật vào tài khoản ngân hàng. Muốn nhận tiền thật cần tích hợp cổng thanh toán/ngân hàng được cấp phép và cấu hình merchant credentials/webhook riêng.

### Gọi API thanh toán

```http
POST /payments
Authorization: Bearer <JWT>
Idempotency-Key: checkout-<unique-uuid>
Content-Type: application/json

{ "orderId": "<uuid>", "method": "WALLET", "provider": "MOCK" }
```
