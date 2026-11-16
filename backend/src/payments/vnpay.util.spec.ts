import { stringify } from 'node:querystring';
import { createHmac } from 'node:crypto';

import {
  buildVnpayUrl,
  getClientIp,
  normalizeQuery,
  toSignData,
  verifyVnpay,
  vnpayDate,
} from './vnpay.util';

const SECRET = 'TESTSECRETTESTSECRETTESTSECRET12';

// Cài đặt tham chiếu theo đúng mã demo Node.js của VNPay
// (sortObject + querystring.stringify encode:false + HMAC-SHA512).
function referenceSign(params: Record<string, string>, secret: string) {
  const keys = Object.keys(params).map(encodeURIComponent).sort();
  const sorted: Record<string, string> = {};
  for (const k of keys) {
    sorted[k] = encodeURIComponent(params[k]).replace(/%20/g, '+');
  }
  const signData = stringify(sorted, undefined, undefined, {
    encodeURIComponent: (s: string) => s,
  });
  return createHmac('sha512', secret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');
}

describe('vnpay.util', () => {
  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: 'ABC12345',
    vnp_Amount: 12300000,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: '1700000000000deadbeef',
    vnp_OrderInfo: 'Thanh toan don hang 42',
    vnp_ReturnUrl: 'http://localhost:3001/payments/vnpay/return',
    vnp_CreateDate: '20261113120000',
  };

  it('sắp xếp key, encode khoảng trắng thành "+", bỏ tham số rỗng', () => {
    const data = toSignData({ b: 'x y', a: '1', c: '', d: undefined });
    expect(data).toBe('a=1&b=x+y');
  });

  it('chữ ký khớp với cài đặt tham chiếu của VNPay', () => {
    const url = buildVnpayUrl('https://sandbox.example/pay', SECRET, params);
    const hash = new URL(url).searchParams.get('vnp_SecureHash');

    const asStrings = Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    );
    expect(hash).toBe(referenceSign(asStrings, SECRET));
  });

  it('verifyVnpay: hợp lệ, sai secret và bị sửa dữ liệu', () => {
    const url = new URL(
      buildVnpayUrl('https://sandbox.example/pay', SECRET, params),
    );
    const query = Object.fromEntries(url.searchParams.entries());

    expect(verifyVnpay(query, SECRET)).toBe(true);
    expect(verifyVnpay(query, 'WRONGSECRET')).toBe(false);
    expect(verifyVnpay({ ...query, vnp_Amount: '1' }, SECRET)).toBe(false);

    const { vnp_SecureHash: _omit, ...noHash } = query;
    expect(verifyVnpay(noHash, SECRET)).toBe(false);
    expect(verifyVnpay({ ...query, vnp_SecureHash: 'zzzz' }, SECRET)).toBe(
      false,
    );
  });

  it('verifyVnpay bỏ qua vnp_SecureHashType và tham số không phải vnp_', () => {
    const url = new URL(
      buildVnpayUrl('https://sandbox.example/pay', SECRET, params),
    );
    const query = Object.fromEntries(url.searchParams.entries());

    expect(
      verifyVnpay(
        { ...query, vnp_SecureHashType: 'HmacSHA512', utm_source: 'x' },
        SECRET,
      ),
    ).toBe(true);
  });

  it('vnpayDate dùng giờ GMT+7', () => {
    expect(vnpayDate(new Date(Date.UTC(2026, 10, 13, 5, 30, 15)))).toBe(
      '20261113123015',
    );
    // 20:00 UTC => 03:00 ngày hôm sau theo giờ Việt Nam
    expect(vnpayDate(new Date(Date.UTC(2026, 11, 31, 20, 0, 0)))).toBe(
      '20270101030000',
    );
  });

  it('normalizeQuery chỉ giữ giá trị chuỗi', () => {
    expect(
      normalizeQuery({ a: '1', b: ['x', 'y'], c: { d: 'e' }, f: undefined }),
    ).toEqual({ a: '1' });
    expect(normalizeQuery(null)).toEqual({});
  });

  it('getClientIp chuẩn hóa IPv6 loopback và x-forwarded-for', () => {
    expect(
      getClientIp({ headers: {}, socket: { remoteAddress: '::1' } }),
    ).toBe('127.0.0.1');
    expect(
      getClientIp({
        headers: {},
        socket: { remoteAddress: '::ffff:192.168.1.5' },
      }),
    ).toBe('192.168.1.5');
    expect(
      getClientIp({
        headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
        socket: { remoteAddress: '10.0.0.1' },
      }),
    ).toBe('203.0.113.9');
  });
});
