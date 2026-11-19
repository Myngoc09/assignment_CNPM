# BrewLite – Project Tasks

# HƯỚNG DẪN CẬP NHẬT VÀ CHẠY BREWLITE BẰNG DOCKER

ê những ai chưa tạo bàng lần nào thì chạy từ bước 1 nha còn đã tạo trước đó rồi xong pull tiếp task10 này thì chạy để tải bảng promo_code

cd backend
npm.cmd run migration:run

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
├── backend/                            # API NestJS
│   ├── src/
│   │   ├── main.ts                     # Khởi động API, cấu hình validate đầu vào
│   │   ├── app.module.ts               # Kết nối các module và PostgreSQL
│   │   ├── auth/                       # Đăng nhập, JWT và phân quyền
│   │   ├── users/                      # Đăng ký và quản lý tài khoản
│   │   ├── products/                   # Menu, giá theo size, quản lý sản phẩm
│   │   ├── orders/                     # Tạo đơn, lịch sử và trạng thái đơn
│   │   ├── payments/                   # Thanh toán và Idempotency-Key
│   │   ├── inventory/                  # Nhập, giữ và trừ tồn kho
│   │   ├── promotions/                 # Mã giảm giá
│   │   ├── loyalty/                    # Điểm thưởng và lịch sử điểm
│   │   └── database/
│   │       ├── data-source.ts          # Cấu hình TypeORM cho migration
│   │       ├── migrations/             # Tạo và cập nhật bảng
│   │       └── seeds/
│   │           └── initial-data.sql   # Dữ liệu mẫu
│   ├── test/                           # Kiểm thử end-to-end của backend
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   ├── .env                            # Cấu hình trên máy local
│   └── package.json
│
├── frontend/                           # Giao diện Next.js
│   ├── app/
│   │   ├── layout.tsx                  # Bố cục chung
│   │   ├── page.tsx                    # Trang menu
│   │   ├── components/
│   │   │   └── ProductModal.tsx        # Chi tiết món, chọn size và topping
│   │   ├── cart/page.tsx               # Giỏ hàng và tạo đơn
│   │   ├── checkout/page.tsx           # Thanh toán và xác nhận đơn
│   │   ├── orders/page.tsx             # Lịch sử đơn hàng
│   │   ├── profile/page.tsx            # Tài khoản và điểm thưởng
│   │   ├── forgot-password/page.tsx    # Quên mật khẩu
│   │   ├── reset-password/page.tsx     # Đặt lại mật khẩu
│   │   └── admin/
│   │       ├── products/page.tsx       # Quản lý sản phẩm
│   │       └── inventory/page.tsx      # Quản lý tồn kho
│   ├── store/
│   │   └── useCartStore.ts             # Trạng thái giỏ hàng bằng Zustand
│   ├── public/                         # Tài nguyên tĩnh
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
│
├── mock-bank/                          # Dịch vụ thanh toán mô phỏng
│   ├── src/
│   │   ├── main.ts                     # Khởi động dịch vụ ở cổng 3004
│   │   ├── app.module.ts
│   │   └── payments/                   # Xử lý giao dịch mô phỏng
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   └── package.json
│
├── scripts/
│   └── setup-db.ps1                    # Chạy migration và nạp dữ liệu mẫu
├── docker-compose.yml                  # Chạy PostgreSQL, backend và frontend
└── README.md                           # Hướng dẫn cài đặt và chạy dự án
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

MOCK_BANK_URL=http://localhost:3004
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

Mock Bank không chạy trong Docker Compose mà chạy riêng trên máy tính tại cổng 3004.

Backend trong Docker kết nối tới Mock Bank thông qua:

```text
http://host.docker.internal:3004
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

Mock Bank cần lắng nghe ở `http://localhost:3004`. Giá trị `MOCK_BANK_API_KEY` trong backend và Mock Bank phải khớp nhau. Backend cần có `MOCK_BANK_URL` trỏ tới Mock Bank; khi backend chạy trong Docker Compose, cấu hình mẫu là `http://host.docker.internal:3004`.

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

## Task 10-2: Idempotent payment, promotions and loyalty points

- Mock Bank payment requests use `Idempotency-Key`; a repeated key with the same payload replays the original result, while a different payload is rejected.
- Promo-code discount and loyalty-point discount are stored as order snapshots for order history.
- Loyalty conversion: **1 point = 1 VND**. Points used by unpaid orders are reserved when checking available balance, but the customer's point balance is debited only after payment succeeds.
- Successful payment earns `floor(actual_paid_amount * 5%)` points. The actual paid amount is the order total after promo and point discounts.
- Failed payment does not debit or award points. Replayed successful payment does not process loyalty transactions a second time.
- API: `GET /loyalty/me`, `GET /loyalty/me/transactions`; create an order with optional `pointsToRedeem` and `promoCode`.



## TASK 10 - THANH TOAN, KHUYEN MAI VA DIEM THUONG

### 1. Thanh toán Idempotent
- Tích hợp thanh toán thông qua BrewLite Mock Bank.
- Sử dụng `Idempotency-Key` để định danh yêu cầu thanh toán.
- Ngăn chặn thanh toán trùng lặp khi gửi lại cùng yêu cầu với cùng khóa.
- Từ chối yêu cầu nếu cùng khóa nhưng nội dung khác.
- Lưu thông tin và kết quả thanh toán.

### 2. Khuyến mãi
- Lấy danh sách mã khuyến mãi đang hoạt động.
- Kiểm tra điều kiện áp dụng mã khuyến mãi.
- Hỗ trợ giảm giá theo phần trăm và giới hạn số tiền giảm tối đa.
- Lưu mã khuyến mãi và số tiền giảm vào đơn hàng.

Mã khuyến mãi mẫu:
- Mã: `BREWLITE10`
- Giảm giá: 10%.
- Đơn hàng tối thiểu: 30.000 VND.
- Giảm tối đa: 20.000 VND.

### 3. Tích lũy và sử dụng điểm thưởng
- Hiển thị số dư điểm thưởng.
- Quy đổi 1 điểm = 1 VND.
- Cho phép sử dụng điểm để giảm giá đơn hàng.
- Không cho phép sử dụng vượt quá số điểm hiện có.
- Chỉ trừ điểm sau khi thanh toán thành công.
- Cộng điểm thưởng bằng 5% số tiền thực tế khách đã thanh toán.
- Lưu lịch sử cộng và trừ điểm.
- Ngăn chặn cộng/trừ điểm nhiều lần khi thanh toán được gửi lại.

### 4. Giao diện
- Giỏ hàng/checkout: hiển thị điểm khả dụng, điểm sử dụng, tiền giảm và tổng tiền.
- Hồ sơ: hiển thị số dư và lịch sử điểm.
- Lịch sử đơn hàng: hiển thị mã khuyến mãi, số tiền giảm, điểm đã sử dụng và điểm được cộng.

### 5. API liên quan

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/promotions` | Danh sách khuyến mãi |
| POST | `/promotions/validate` | Kiểm tra mã khuyến mãi |
| POST | `/orders` | Tạo đơn hàng |
| GET | `/orders/me` | Lịch sử đơn hàng |
| POST | `/payments` | Thanh toán |
| GET | `/payments/:id` | Tra cứu thanh toán |
| GET | `/loyalty/me` | Số dư điểm |
| GET | `/loyalty/me/transactions` | Lịch sử điểm |

### 6. Công nghệ
- Backend: NestJS, TypeScript, TypeORM.
- Database: PostgreSQL.
- Frontend: Next.js.
- Thanh toán mô phỏng: BrewLite Mock Bank.
- Docker Compose.
