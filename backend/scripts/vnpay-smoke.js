/**
 * Kiểm tra nhanh cấu hình VNPay Sandbox, KHÔNG cần database / đăng nhập.
 *
 *   npm run vnpay:smoke
 *
 * Script đọc backend/.env, tạo một URL thanh toán 10.000đ đã ký bằng đúng
 * TmnCode/HashSecret của bạn, in URL ra và lưu mã QR vào vnpay-smoke-qr.png.
 * Mở URL (hoặc quét QR): nếu trang thanh toán VNPay hiện ra thì TmnCode và
 * chữ ký đã đúng; nếu VNPay báo lỗi (sai chữ ký / website không hợp lệ...)
 * thì kiểm tra lại TmnCode và HashSecret trong .env.
 */
const path = require('node:path');
const QRCode = require('qrcode');

try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  console.error('Không đọc được backend/.env — hãy tạo file này từ .env.example.');
  process.exit(1);
}

const { buildVnpayUrl, vnpayDate } = require('../dist/payments/vnpay.util.js');

const tmnCode = process.env.VNPAY_TMN_CODE;
const secret = process.env.VNPAY_HASH_SECRET;
const baseUrl =
  process.env.VNPAY_PAYMENT_URL ||
  process.env.VNPAY_URL ||
  'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const returnUrl =
  process.env.VNPAY_RETURN_URL || 'http://localhost:3001/payments/vnpay/return';

if (!tmnCode || !secret) {
  console.error('Thiếu VNPAY_TMN_CODE hoặc VNPAY_HASH_SECRET trong .env');
  process.exit(1);
}

const now = new Date();
const url = buildVnpayUrl(baseUrl, secret, {
  vnp_Version: '2.1.0',
  vnp_Command: 'pay',
  vnp_TmnCode: tmnCode,
  vnp_Amount: 10000 * 100,
  vnp_CurrCode: 'VND',
  vnp_TxnRef: `SMOKE${now.getTime()}`,
  vnp_OrderInfo: 'Thanh toan thu nghiem BrewLite',
  vnp_OrderType: 'other',
  vnp_Locale: 'vn',
  vnp_ReturnUrl: returnUrl,
  vnp_IpAddr: '127.0.0.1',
  vnp_CreateDate: vnpayDate(now),
  vnp_ExpireDate: vnpayDate(new Date(now.getTime() + 15 * 60_000)),
});

(async () => {
  const file = path.join(__dirname, '..', 'vnpay-smoke-qr.png');
  await QRCode.toFile(file, url, {
    errorCorrectionLevel: 'L',
    margin: 2,
    width: 600,
  });

  console.log('TmnCode     :', tmnCode);
  console.log('Return URL  :', returnUrl);
  console.log('\nURL thanh toán thử nghiệm (hiệu lực 15 phút):\n');
  console.log(url);
  console.log('\nĐã lưu mã QR:', file);
})();
