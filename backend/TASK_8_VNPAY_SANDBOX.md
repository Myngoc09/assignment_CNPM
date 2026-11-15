# Task 8 – Thanh toán không tiền mặt: Mock Bank + VNPay Sandbox + mã QR (Backend)

## Phạm vi

Chỉ sửa backend, module `src/payments`. Mock Bank giữ nguyên. Frontend, orders, products, auth không đổi.

| File | Nội dung |
|---|---|
| `src/payments/vnpay.service.ts` | Tạo giao dịch VNPay, sinh mã QR, xử lý IPN và Return URL |
| `src/payments/vnpay.util.ts` | Ký HMAC-SHA512, xác thực chữ ký, định dạng ngày GMT+7, lấy IP |
| `src/payments/payments.service.ts` | Rẽ nhánh theo `provider` (`MOCK` / `VNPAY`), kiểm tra `Idempotency-Key` |
| `src/payments/payments.controller.ts` | `POST /payments`, `GET /payments/:id`, `GET /payments/vnpay/ipn`, `GET /payments/vnpay/return` |
| `src/payments/entities/payment.entity.ts` | Thêm cột `idempotencyKey` (index duy nhất theo user) |
| `src/payments/dto/create-payment.dto.ts` | `provider` nhận `MOCK` hoặc `VNPAY` |
| `scripts/vnpay-smoke.js` | Kiểm tra nhanh cấu hình VNPay, không cần database |
| `src/config/runtime-config.ts` | CORS (`CORS_ORIGINS`) và TypeORM (`DB_SSL`, `DB_SYNCHRONIZE`) đọc từ `.env` |
| `src/main.ts`, `src/app.module.ts` | Dùng cấu hình trên; mặc định giữ nguyên hành vi cũ |

Thư viện mới: `qrcode` (+ `@types/qrcode`). Chạy `npm install` sau khi giải nén.

## Cấu hình

Sao chép `.env.example` thành `.env` rồi điền:

```env
VNPAY_TMN_CODE=<TmnCode trong email VNPay>
VNPAY_HASH_SECRET=<HashSecret trong email VNPay>
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3001/payments/vnpay/return
```

`VNPAY_RETURN_URL` là địa chỉ VNPay chuyển **trình duyệt của người thanh toán** về. Chọn theo cách demo:

| Cách thanh toán | `VNPAY_RETURN_URL` |
|---|---|
| Mở `paymentUrl` ngay trên máy chạy backend | `http://localhost:3001/payments/vnpay/return` |
| Quét QR bằng điện thoại (cùng Wi-Fi) | `http://<IP-LAN-của-máy>:3001/payments/vnpay/return` |
| Khác mạng, hoặc muốn nhận IPN thật | URL ngrok: `https://<ngrok>/payments/vnpay/return` |

Trên điện thoại, `localhost` là chính chiếc điện thoại nên không về được backend. Nếu dùng IP LAN, kiểm tra firewall có cho phép cổng 3001.

**Không commit `.env`** (đã nằm trong `.gitignore`).

### Kiểm tra nhanh cấu hình

```bash
npm run vnpay:smoke
```

Script tạo một URL thanh toán thử 10.000đ bằng `TmnCode`/`HashSecret` trong `.env`, in URL ra và lưu mã QR vào `vnpay-smoke-qr.png`. Mở URL: nếu trang thanh toán VNPay hiện ra thì cấu hình đúng; nếu VNPay báo lỗi (sai chữ ký, website không hợp lệ...) thì kiểm tra lại hai giá trị trên.

## API

### Tạo giao dịch (cần JWT)

```http
POST /payments
Authorization: Bearer <JWT>
Idempotency-Key: 6f1c2d9e-0b7a-4f53-9d1e-aa11bb22cc33   (tùy chọn)

{ "orderId": "<ORDER_UUID>", "method": "WALLET", "provider": "VNPAY" }
```

```json
{
  "message": "Quét mã QR hoặc mở paymentUrl để thanh toán qua VNPay",
  "paymentId": "...",
  "orderId": "...",
  "amount": 123000,
  "provider": "VNPAY",
  "status": "PENDING",
  "expiresAt": "2026-11-13T05:15:00.000Z",
  "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
  "qrCode": "data:image/png;base64,..."
}
```

- `qrCode` là ảnh PNG dạng data URL, đặt thẳng vào `<img src={qrCode} />`. Nội dung QR chính là `paymentUrl`; điện thoại quét sẽ mở trang thanh toán VNPay.
- `method` (`WALLET` / `CARD`) chỉ được lưu lại, không ép ngân hàng trên trang VNPay. Không ép kênh `VNPAYQR` vì điện thoại mở link từ QR sẽ lại thấy trang QR của VNPay.
- Số tiền VNPay chấp nhận: từ 5.000đ đến dưới 1 tỷ đồng.
- `provider: "MOCK"` vẫn chạy như cũ (trả `PAID` / `PAYMENT_FAILED` ngay).

### Xem giao dịch (cần JWT)

`GET /payments/:id` — client polling mỗi 3 giây cho tới khi `status` là `PAID` hoặc `PAYMENT_FAILED`. Khi còn chờ thanh toán và chưa hết hạn, kết quả kèm `paymentUrl`, `qrCode`, `expiresAt`.

### Callback từ VNPay (không dùng JWT, xác thực bằng chữ ký)

- `GET /payments/vnpay/ipn` — VNPay gọi server-to-server, trả `{ "RspCode": "00", "Message": "Confirm Success" }`. Các mã khác: `01` không thấy giao dịch, `02` đã xử lý, `04` sai số tiền, `97` sai chữ ký, `99` lỗi khác.
- `GET /payments/vnpay/return` — trình duyệt người thanh toán được chuyển về. Nếu có `VNPAY_RESULT_REDIRECT_URL` thì redirect tới đó kèm `?status=&orderId=&paymentId=`; nếu không thì trả JSON `{ success, status, orderId, paymentId, responseCode, message }`.

## Cách xử lý kết quả

IPN và Return URL **dùng chung một hàm** (`VnpayService.processCallback`): xác thực chữ ký, tìm giao dịch theo `vnp_TxnRef`, đối chiếu số tiền, rồi cập nhật trong một transaction có khóa. Nhờ vậy:

- Chạy local không có IPN công khai vẫn cập nhật được đơn qua Return URL.
- IPN và Return cùng tới thì chỉ xử lý một lần (lần sau trả `02`).
- Chỉ callback **đã ký đúng** và `vnp_ResponseCode = 00`, `vnp_TransactionStatus = 00` mới đưa đơn sang `PAID`.

Trạng thái đơn: `PENDING → PAID` khi thành công, `PENDING → PAYMENT_FAILED` khi lỗi/hủy. Thử lại từ `PAYMENT_FAILED` sẽ đưa đơn về `PENDING` (khớp sơ đồ máy trạng thái ở Task 10).

Muốn VNPay gọi IPN thật: dùng URL công khai (ngrok) và khai báo `https://<ngrok>/payments/vnpay/ipn` trong trang quản trị merchant của VNPay. Backend không đọc biến `VNPAY_IPN_URL`.

## Chạy công khai (ngrok + frontend Vercel)

VNPay chỉ gọi được IPN, và điện thoại chỉ về được Return URL, khi backend có địa chỉ công khai HTTPS.

1. Mở tunnel tới cổng backend: `ngrok http 3001 --url=<domain-ngrok-của-bạn>` (cần `ngrok config add-authtoken <token>` một lần).
2. `backend/.env`:
   ```env
   VNPAY_RETURN_URL=https://<domain-ngrok>/payments/vnpay/return
   FRONTEND_URL=https://<frontend>.vercel.app
   CORS_ORIGINS=https://<frontend>.vercel.app,http://localhost:3000
   ```
3. Trên Vercel đặt `NEXT_PUBLIC_API_URL=https://<domain-ngrok>` rồi deploy lại.
4. (Tùy chọn) Khai báo IPN URL `https://<domain-ngrok>/payments/vnpay/ipn` trong trang quản trị merchant của VNPay.
5. Gói ngrok miễn phí chèn trang cảnh báo trước lưu lượng HTML từ trình duyệt; request gửi kèm header `ngrok-skip-browser-warning` (giá trị bất kỳ) thì bỏ qua được. Frontend nên gửi header này cho mọi lời gọi API. CORS của backend đã cho phép header đó và `Idempotency-Key`.
6. Chỉ đặt `VNPAY_RESULT_REDIRECT_URL` khi frontend đã có trang kết quả; nếu không người dùng sẽ gặp 404.

Database đám mây: đặt `DB_SSL=true`. `CORS_ORIGINS` để trống thì cho phép mọi origin (như trước).

## Idempotency

- Header `Idempotency-Key` (8–100 ký tự: chữ, số, `- _ : .`): gửi lại cùng key cho cùng đơn thì trả lại giao dịch cũ, không tạo mới. Cùng key cho đơn khác trả `409`.
- Không có key mà đơn đang có giao dịch VNPay còn hạn thì dùng lại giao dịch đó.
- Chưa làm: `Idempotency-Key` cho provider `MOCK` (thuộc Task 10).

## Chuẩn bị cho Task 9 và Task 10

- **Điểm duy nhất chuyển đơn sang `PAID`/`PAYMENT_FAILED` của luồng VNPay** là `processCallback` trong `vnpay.service.ts`, có đánh dấu `TASK 10 HOOK`. Khi làm Task 10, thêm vào đó: `assertTransition`, trừ tồn kho (optimistic locking), cộng điểm thưởng sau `PAID`.
- Task 9 (xác nhận đơn, `GET /orders/me`): frontend dùng `GET /payments/:id` để biết kết quả, hoặc đặt `VNPAY_RESULT_REDIRECT_URL` trỏ tới trang xác nhận.
- Docker Compose: `VNPAY_RETURN_URL` phải là địa chỉ mà **trình duyệt** truy cập được (ví dụ `http://localhost:3001/...` khi cổng 3001 đã được map ra máy host), không phải tên service nội bộ.
- Đơn VNPay chờ thanh toán không tự hết hạn trong database; giao dịch hết hạn chỉ làm QR/URL ngừng hiệu lực. Nếu Task 10 trừ tồn kho lúc tạo đơn thì cần thêm bước giải phóng tồn kho cho đơn bỏ dở.

## Kiểm thử

```bash
npm ci
npm run build
npm test -- src/payments
```

Cần Node.js 24.9 trở lên (Jest nạp NestJS 12 dạng ES Module). Test dùng database giả trong bộ nhớ và mô phỏng IPN/Return có chữ ký, nên không cần tài khoản VNPay hay PostgreSQL. Các test `products.*.spec.ts` có sẵn lỗi từ bản gốc (chưa khai báo repository), không liên quan Task 8.

Chưa kiểm thử trực tiếp với máy chủ VNPay Sandbox; hãy chạy `npm run vnpay:smoke` và một giao dịch thật trước khi demo.
