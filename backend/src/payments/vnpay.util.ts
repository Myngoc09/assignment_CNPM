import { createHmac, timingSafeEqual } from 'node:crypto';

export type VnpayParams = Record<string, string | number | undefined>;

/**
 * Chuỗi dữ liệu để ký: key sắp xếp A→Z, value encodeURIComponent
 * (khoảng trắng thành '+'), nối bằng '&'. Đây là chuẩn của VNPay.
 * Tham số rỗng/undefined bị bỏ qua.
 */
export function toSignData(params: VnpayParams): string {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== '')
    .sort()
    .map(
      (k) =>
        `${k}=${encodeURIComponent(String(params[k])).replace(/%20/g, '+')}`,
    )
    .join('&');
}

export function signVnpay(data: string, secret: string): string {
  return createHmac('sha512', secret)
    .update(Buffer.from(data, 'utf-8'))
    .digest('hex');
}

/** Tạo URL thanh toán đã ký: <baseUrl>?<params>&vnp_SecureHash=<hash> */
export function buildVnpayUrl(
  baseUrl: string,
  secret: string,
  params: VnpayParams,
): string {
  const data = toSignData(params);
  return `${baseUrl}?${data}&vnp_SecureHash=${signVnpay(data, secret)}`;
}

/**
 * Chuẩn hóa query của Express (có thể là mảng/object lồng nhau)
 * thành Record<string, string>; bỏ mọi giá trị không phải string.
 */
export function normalizeQuery(query: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (typeof query !== 'object' || query === null) return result;

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') result[key] = value;
  }
  return result;
}

/**
 * Xác thực chữ ký VNPay gửi về (Return URL hoặc IPN).
 * Chỉ các tham số bắt đầu bằng "vnp_" (trừ vnp_SecureHash / vnp_SecureHashType)
 * được đưa vào chuỗi ký.
 */
export function verifyVnpay(
  query: Record<string, string>,
  secret: string,
): boolean {
  const received = query.vnp_SecureHash;
  if (!received || !/^[0-9a-fA-F]+$/.test(received)) return false;

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (
      key.startsWith('vnp_') &&
      key !== 'vnp_SecureHash' &&
      key !== 'vnp_SecureHashType'
    ) {
      params[key] = value;
    }
  }

  const expected = Buffer.from(signVnpay(toSignData(params), secret), 'hex');
  const actual = Buffer.from(received, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Định dạng yyyyMMddHHmmss theo giờ Việt Nam (GMT+7). */
export function vnpayDate(date: Date = new Date()): string {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14);
}

/** Lấy IP client (ưu tiên x-forwarded-for), chuẩn hóa IPv6 loopback. */
export function getClientIp(req: {
  headers: Record<string, string | string[] | undefined>;
  socket: { remoteAddress?: string };
}): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(',')[0]
    ?.trim();

  const ip = first || req.socket.remoteAddress || '127.0.0.1';
  return ip === '::1' ? '127.0.0.1' : ip.replace('::ffff:', '');
}

/** Thông điệp tiếng Việt cho các mã vnp_ResponseCode thường gặp. */
const RESPONSE_MESSAGES: Record<string, string> = {
  '00': 'Giao dịch thành công',
  '07': 'Giao dịch bị nghi ngờ gian lận',
  '09': 'Thẻ/tài khoản chưa đăng ký Internet Banking',
  '10': 'Xác thực thông tin thẻ/tài khoản sai quá 3 lần',
  '11': 'Đã hết hạn chờ thanh toán',
  '12': 'Thẻ/tài khoản bị khóa',
  '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP)',
  '24': 'Khách hàng đã hủy giao dịch',
  '51': 'Tài khoản không đủ số dư',
  '65': 'Tài khoản vượt hạn mức giao dịch trong ngày',
  '75': 'Ngân hàng thanh toán đang bảo trì',
  '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
  '99': 'Lỗi không xác định',
};

export function describeResponseCode(code: string | undefined): string {
  if (!code) return 'Không có mã phản hồi';
  return RESPONSE_MESSAGES[code] ?? `Giao dịch không thành công (mã ${code})`;
}
