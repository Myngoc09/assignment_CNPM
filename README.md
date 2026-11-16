# Task 8 – Backend Payment (BrewLite)

## 1. Giới thiệu

Task 8 triển khai chức năng thanh toán cho hệ thống BrewLite bằng NestJS và PostgreSQL.

Backend hỗ trợ hai nhà cung cấp thanh toán:

- **Mock Bank:** Mô phỏng hệ thống ngân hàng, hỗ trợ kiểm thử giao dịch thành công và thất bại.
- **VNPay Sandbox:** Tích hợp cổng thanh toán VNPay ở môi trường thử nghiệm.

Backend chịu trách nhiệm tạo giao dịch, xác minh kết quả thanh toán và cập nhật trạng thái đơn hàng. Không sử dụng trạng thái thanh toán do Frontend tự gửi lên làm căn cứ xác nhận đơn hàng đã thanh toán.

## 2. Công nghệ sử dụng

- NestJS
- TypeScript
- PostgreSQL
- TypeORM
- Docker
- JWT Authentication
- Mock Bank API
- VNPay Sandbox
- HMAC-SHA512 để xác minh chữ ký callback VNPay

## 3. Kiến trúc xử lý thanh toán

```text
Frontend / Postman
       |
       | JWT Authentication
       v
BrewLite Backend (NestJS)
       |
       +------ PostgreSQL
       |       |
       |       +-- Orders
       |       +-- Order Items
       |       +-- Payments
       |
       +------ Mock Bank
       |       |
       |       +-- SUCCESS
       |       +-- FAILED
       |
       +------ VNPay Sandbox
               |
               +-- Payment URL
               +-- Browser Return
               +-- IPN Callback (endpoint hỗ trợ)
```

## 4. Trạng thái giao dịch

### Payment Status

| Trạng thái | Ý nghĩa |
|---|---|
| PENDING | Giao dịch đang chờ xử lý |
| PAID | Thanh toán thành công |
| PAYMENT_FAILED | Thanh toán thất bại |

### Order Status

| Trạng thái | Ý nghĩa |
|---|---|
| PENDING | Đơn hàng đang chờ thanh toán |
| PAID | Đơn hàng đã thanh toán |
| PAYMENT_FAILED | Thanh toán thất bại |

## 5. API sử dụng

Base URL mặc định:

```text
http://localhost:3001
```

### 5.1. Đăng ký tài khoản

**POST** `/auth/register`

Body:

```json
{
  "fullName": "Nguyen Van A",
  "email": "test@example.com",
  "phone": "0912345678",
  "password": "Test123456"
}
```

### 5.2. Đăng nhập

**POST** `/auth/login`

Body:

```json
{
  "email": "test@example.com",
  "password": "Test123456"
}
```

Kết quả trả về có trường `access_token`, sử dụng làm Bearer Token cho các API yêu cầu đăng nhập.

### 5.3. Lấy danh sách sản phẩm

**GET** `/products`

Sử dụng API này để lấy `productId` hợp lệ trước khi tạo đơn hàng.

### 5.4. Tạo đơn hàng

**POST** `/orders`

Yêu cầu JWT Authentication.

Body:

```json
{
  "items": [
    {
      "productId": "1",
      "size": "M",
      "toppings": ["Trân châu"],
      "qty": 2
    }
  ]
}
```

Backend tự lấy giá sản phẩm từ database và tính tổng tiền. Không tin tưởng giá do Client gửi lên.

### 5.5. Tạo giao dịch thanh toán

**POST** `/payments`

Yêu cầu JWT Authentication.

Body thanh toán qua Mock Bank:

```json
{
  "orderId": "ORDER_UUID",
  "method": "WALLET",
  "provider": "MOCK"
}
```

Body thanh toán qua VNPay:

```json
{
  "orderId": "ORDER_UUID",
  "method": "WALLET",
  "provider": "VNPAY"
}
```

Các giá trị hợp lệ:

- `method`: `WALLET` hoặc `CARD`.
- `provider`: `MOCK` hoặc `VNPAY`.

Đối với VNPay, backend tạo giao dịch ở trạng thái `PENDING` và trả về thông tin thanh toán, bao gồm `paymentUrl` để người dùng tiếp tục thanh toán trên VNPay Sandbox.

### 5.6. Kiểm tra giao dịch

**GET** `/payments/:id`

Yêu cầu JWT Authentication.

Chỉ chủ sở hữu giao dịch mới được phép xem thông tin thanh toán.

### 5.7. VNPay Return URL

**GET** `/payments/vnpay/return`

VNPay chuyển trình duyệt người dùng về endpoint này sau quá trình thanh toán.

Backend kiểm tra chữ ký và dữ liệu giao dịch trước khi cập nhật trạng thái Payment và Order.

### 5.8. VNPay IPN

**GET** `/payments/vnpay/ipn`

Endpoint nhận thông báo giao dịch từ hệ thống VNPay.

Endpoint không sử dụng JWT Authentication. Việc xác thực dựa trên chữ ký HMAC của VNPay.

IPN được giữ trong backend để hỗ trợ callback server-to-server. Luồng demo hiện tại có thể kiểm thử qua Return URL.

## 6. Quy trình thanh toán

### 6.1. Mock Bank

Mock Bank có hai chế độ, chọn bằng biến `MOCK_BANK_MODE` ở Backend.

**`INTERACTIVE` (mặc định) - có trang xác nhận:**

1. Client tạo đơn hàng, Backend tạo Order `PENDING`.
2. Client gửi yêu cầu tạo Payment với `provider = MOCK`.
3. Backend tạo Payment `PENDING`, gọi `POST /payments/sessions` của Mock Bank và nhận phiên thanh toán.
4. Backend trả `paymentUrl` (trang Mock Bank); Frontend chuyển trình duyệt sang đó.
5. Người dùng bấm **Thanh toán thành công** hoặc **Thanh toán thất bại / Hủy**.
6. Mock Bank ký kết quả (HMAC-SHA256) và gọi `POST /payments/mock/callback/:paymentId` của Backend kèm `x-api-key`.
7. Backend kiểm tra API Key, chữ ký, số tiền, đơn hàng rồi cập nhật Payment và Order (`PAID` / `PAYMENT_FAILED`).
8. Mock Bank chuyển trình duyệt về `/payment/result`.

**`AUTO` - có kết quả ngay, không có trang xác nhận:** Backend gọi `POST /payments/charge`, Mock Bank trả `SUCCESS` hoặc `FAILED` theo `MOCK_PAYMENT_RESULT`.

### 6.2. VNPay Sandbox

1. Client tạo đơn hàng.
2. Backend tạo Order ở trạng thái `PENDING`.
3. Client gửi yêu cầu tạo Payment với `provider = VNPAY`.
4. Backend tạo giao dịch và sinh URL thanh toán.
5. Người dùng truy cập `paymentUrl` để thanh toán trên VNPay Sandbox.
6. VNPay chuyển trình duyệt về Return URL.
7. Backend xác minh chữ ký và thông tin giao dịch.
8. Backend cập nhật trạng thái Payment và Order.

## 7. Các nguyên tắc bảo mật

- Các API tạo đơn hàng và tạo thanh toán yêu cầu JWT Authentication.
- Backend lấy thông tin người dùng từ JWT, không tin tưởng user ID do Client tự gửi.
- Backend tự tính tổng tiền dựa trên dữ liệu sản phẩm trong database.
- Backend xác minh số tiền và thông tin giao dịch trước khi cập nhật trạng thái.
- VNPay callback phải được xác minh chữ ký trước khi xử lý.
- API xem giao dịch kiểm tra quyền sở hữu của người dùng.
- Không cho phép Client tự gửi trạng thái `PAID` để xác nhận thanh toán.
- Xử lý callback theo hướng idempotent nhằm hạn chế cập nhật trùng giao dịch.
- Không commit các thông tin bí mật như API Key, JWT Secret, VNPay Hash Secret và thông tin kết nối database lên GitHub.

## 8. Cấu hình môi trường

Backend cần cấu hình các biến môi trường sau trong file `.env`:

| Biến | Mục đích |
|---|---|
| `PORT` | Cổng chạy Backend |
| `DATABASE_URL` | Kết nối PostgreSQL |
| `JWT_SECRET` | Khóa ký JWT |
| `MOCK_BANK_URL` | Địa chỉ Mock Bank |
| `MOCK_BANK_API_KEY` | API Key kết nối Mock Bank |
| `MOCK_BANK_SECRET` | Secret xác minh giao dịch Mock Bank (phải giống `MOCK_BANK_SECRET` trong `mock-bank/.env`) |
| `MOCK_BANK_MODE` | `INTERACTIVE` (trang xác nhận, mặc định) hoặc `AUTO` |
| `MOCK_BANK_PUBLIC_URL` | Địa chỉ Mock Bank mà trình duyệt truy cập được (mặc định = `MOCK_BANK_URL`) |
| `BACKEND_PUBLIC_URL` | Địa chỉ Backend mà Mock Bank gọi lại (mặc định `http://localhost:PORT`) |
| `VNPAY_TMN_CODE` | Mã website VNPay |
| `VNPAY_HASH_SECRET` | Khóa xác minh chữ ký VNPay |
| `VNPAY_PAYMENT_URL` | Địa chỉ VNPay Sandbox |
| `VNPAY_RETURN_URL` | Địa chỉ Return URL |
| `VNPAY_IPN_URL` | Địa chỉ IPN callback |

**Lưu ý:** Tạo file `.env` theo cấu hình môi trường thực tế. Không sử dụng giá trị bí mật trong README hoặc commit lên GitHub.

## 9. Kiểm thử Backend

Có thể sử dụng Postman để kiểm thử các trường hợp:

| STT | Trường hợp | Kết quả mong đợi |
|---|---|---|
| 1 | Đăng nhập hợp lệ | Trả về JWT |
| 2 | Tạo đơn hàng hợp lệ | Order `PENDING` |
| 3 | Thanh toán Mock Bank thành công | Payment và Order `PAID` |
| 4 | Thanh toán Mock Bank thất bại | Payment và Order `PAYMENT_FAILED` |
| 5 | Tạo thanh toán VNPay | Payment `PENDING` và có `paymentUrl` |
| 6 | VNPay thanh toán thành công | Payment và Order `PAID` |
| 7 | VNPay thanh toán thất bại hoặc bị hủy | Payment và Order được cập nhật theo kết quả đã xác minh |
| 8 | Truy cập giao dịch của người dùng khác | Bị từ chối |
| 9 | Truy cập Payment không tồn tại | Trả về lỗi phù hợp |
| 10 | Callback giao dịch đã xử lý | Không cập nhật giao dịch trùng lặp |

Sau khi kiểm thử API, có thể truy vấn PostgreSQL để đối chiếu trạng thái thực tế của bảng `orders` và `payments`.

## 10. Kết quả triển khai

Backend Task 8 cung cấp:

- Tạo và quản lý giao dịch thanh toán.
- Tích hợp Mock Bank để mô phỏng giao dịch.
- Tích hợp VNPay Sandbox.
- Xác minh kết quả thanh toán trước khi cập nhật dữ liệu.
- Đồng bộ trạng thái Payment và Order.
- Kiểm tra quyền sở hữu giao dịch.
- Hỗ trợ xử lý callback và hạn chế xử lý giao dịch trùng lặp.

---

**Phạm vi:** Tài liệu này mô tả phần Backend của Task 8 trong dự án BrewLite. Giao diện thanh toán và xử lý hiển thị kết quả ở Frontend nằm ngoài phạm vi tài liệu này.