import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { Order, OrderStatus } from '../orders/entities/order.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  Payment,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from './entities/payment.entity';
import { VnpayService } from './vnpay.service';
import { signVnpay, toSignData } from './vnpay.util';

const SECRET = 'TESTSECRETTESTSECRETTESTSECRET12';
const USER = 'user-1';

jest.setTimeout(30_000);

// Tắt log cảnh báo/lỗi cố ý do test gây ra để output gọn.
beforeAll(() => Logger.overrideLogger(false));
afterAll(() => Logger.overrideLogger(['log', 'error', 'warn']));

type Row = Record<string, any>;

/** DataSource giả (in-memory): đủ cho findOne / create / save / transaction. */
function createFakeDb() {
  const tables = new Map<unknown, Row[]>([
    [Order, []],
    [Payment, []],
  ]);

  const manager = {
    findOne: async (entity: unknown, opts: Row) => {
      const rows = (tables.get(entity) ?? []).filter((row) =>
        Object.entries(opts.where).every(([k, v]) => row[k] === v),
      );
      if (opts.order?.createdAt === 'DESC') {
        rows.sort((a, b) => b.createdAt - a.createdAt);
      }
      return rows[0] ?? null;
    },
    create: (_entity: unknown, data: Row) => ({
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    }),
    save: async (entity: unknown, row: Row) => {
      const table = tables.get(entity)!;
      if (!table.includes(row)) table.push(row);
      return row;
    },
  };

  const dataSource = {
    transaction: async (cb: (m: typeof manager) => unknown) => cb(manager),
  } as unknown as DataSource;

  return { tables, dataSource };
}

// Sinh QR thật rất nhanh khi chạy bình thường (~30–90ms) nhưng chậm trong
// môi trường VM của Jest, nên hầu hết test dùng QR giả; chỉ test đầu tiên
// kiểm tra ảnh PNG thật (realQr = true).
const FAKE_QR = 'data:image/png;base64,FAKE';

function makeService(env: Record<string, string> = {}, realQr = false) {
  const db = createFakeDb();
  const config = {
    get: (key: string, fallback?: string) => env[key] ?? fallback,
  } as unknown as ConfigService;
  const service = new VnpayService(db.dataSource, config);
  if (!realQr) {
    jest.spyOn(service, 'generateQr').mockResolvedValue(FAKE_QR);
  }
  return { service, db };
}

const BASE_ENV = {
  VNPAY_TMN_CODE: 'ABC12345',
  VNPAY_HASH_SECRET: SECRET,
  VNPAY_URL: 'https://sandbox.example/paymentv2/vpcpay.html',
  VNPAY_RETURN_URL: 'http://localhost:3001/payments/vnpay/return',
};

function addOrder(
  db: ReturnType<typeof createFakeDb>,
  patch: Partial<Order> = {},
): Order {
  const order = {
    id: randomUUID(),
    userId: USER,
    status: OrderStatus.PENDING,
    total: 123000,
    createdAt: new Date(),
    ...patch,
  } as Order;
  db.tables.get(Order)!.push(order as Row);
  return order;
}

const dtoFor = (orderId: string): CreatePaymentDto => ({
  orderId,
  method: PaymentMethod.WALLET,
  provider: PaymentProvider.VNPAY,
});

/** Tạo query callback đã ký giống hệt VNPay gửi về. */
function signedCallback(
  payment: { txnRef: string; amount: number },
  overrides: Record<string, string> = {},
  secret = SECRET,
) {
  const params: Record<string, string> = {
    vnp_TmnCode: 'ABC12345',
    vnp_Amount: String(payment.amount * 100),
    vnp_BankCode: 'NCB',
    vnp_TransactionNo: '14000001',
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
    vnp_TxnRef: payment.txnRef,
    vnp_OrderInfo: 'Thanh toan don hang',
    vnp_PayDate: '20261113120500',
    ...overrides,
  };
  return {
    ...params,
    vnp_SecureHashType: 'HmacSHA512',
    vnp_SecureHash: signVnpay(toSignData(params), secret),
  };
}

describe('VnpayService.createPayment', () => {
  it('tạo giao dịch PENDING, URL đã ký (amount x100) và mã QR PNG', async () => {
    const { service, db } = makeService(BASE_ENV, true);
    const order = addOrder(db);

    const res = await service.createPayment(dtoFor(order.id), USER, {
      ipAddr: '127.0.0.1',
    });

    expect(res.status).toBe(PaymentStatus.PENDING);
    expect(res.provider).toBe(PaymentProvider.VNPAY);
    expect(res.qrCode).toMatch(/^data:image\/png;base64,/);

    const url = new URL(res.paymentUrl as string);
    expect(url.origin + url.pathname).toBe(BASE_ENV.VNPAY_URL);
    expect(url.searchParams.get('vnp_Amount')).toBe(String(123000 * 100));
    expect(url.searchParams.get('vnp_TmnCode')).toBe('ABC12345');
    expect(url.searchParams.get('vnp_ExpireDate')).toBeTruthy();
    expect(url.searchParams.get('vnp_SecureHash')).toHaveLength(128);

    expect(order.status).toBe(OrderStatus.PENDING);
    expect(db.tables.get(Payment)).toHaveLength(1);
  });

  it('cùng Idempotency-Key gửi 2 lần chỉ tạo 1 giao dịch', async () => {
    const { service, db } = makeService(BASE_ENV);
    const order = addOrder(db);
    const ctx = { ipAddr: '127.0.0.1', idempotencyKey: 'key-0001-abcd' };

    const a = await service.createPayment(dtoFor(order.id), USER, ctx);
    const b = await service.createPayment(dtoFor(order.id), USER, ctx);

    expect(b.paymentId).toBe(a.paymentId);
    expect(db.tables.get(Payment)).toHaveLength(1);
  });

  it('Idempotency-Key đã dùng cho đơn khác => 409', async () => {
    const { service, db } = makeService(BASE_ENV);
    const o1 = addOrder(db);
    const o2 = addOrder(db);
    const ctx = { ipAddr: '127.0.0.1', idempotencyKey: 'key-0001-abcd' };

    await service.createPayment(dtoFor(o1.id), USER, ctx);
    await expect(
      service.createPayment(dtoFor(o2.id), USER, ctx),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('không có key nhưng đơn đang chờ thanh toán còn hạn => dùng lại giao dịch cũ', async () => {
    const { service, db } = makeService(BASE_ENV);
    const order = addOrder(db);
    const ctx = { ipAddr: '127.0.0.1' };

    const a = await service.createPayment(dtoFor(order.id), USER, ctx);
    const b = await service.createPayment(dtoFor(order.id), USER, ctx);

    expect(b.paymentId).toBe(a.paymentId);
    expect(db.tables.get(Payment)).toHaveLength(1);
  });

  it('giao dịch cũ đã hết hạn => tạo giao dịch mới', async () => {
    const { service, db } = makeService(BASE_ENV);
    const order = addOrder(db);
    const ctx = { ipAddr: '127.0.0.1' };

    const a = await service.createPayment(dtoFor(order.id), USER, ctx);
    const old = db.tables.get(Payment)![0];
    old.createdAt = new Date(Date.now() - 20 * 60_000); // quá 15 phút

    const b = await service.createPayment(dtoFor(order.id), USER, ctx);
    expect(b.paymentId).not.toBe(a.paymentId);
    expect(db.tables.get(Payment)).toHaveLength(2);
  });

  it('đơn PAYMENT_FAILED thử lại: PAYMENT_FAILED -> PENDING + giao dịch mới', async () => {
    const { service, db } = makeService(BASE_ENV);
    const order = addOrder(db, { status: OrderStatus.PAYMENT_FAILED });

    const res = await service.createPayment(dtoFor(order.id), USER, {
      ipAddr: '127.0.0.1',
    });

    expect(res.status).toBe(PaymentStatus.PENDING);
    expect(order.status).toBe(OrderStatus.PENDING);
  });

  it('từ chối đơn đã PAID, số tiền quá nhỏ, đơn không phải của user', async () => {
    const { service, db } = makeService(BASE_ENV);
    const ctx = { ipAddr: '127.0.0.1' };

    const paid = addOrder(db, { status: OrderStatus.PAID });
    await expect(
      service.createPayment(dtoFor(paid.id), USER, ctx),
    ).rejects.toMatchObject({ status: 409 });

    const tiny = addOrder(db, { total: 4000 });
    await expect(
      service.createPayment(dtoFor(tiny.id), USER, ctx),
    ).rejects.toMatchObject({ status: 400 });

    const other = addOrder(db, { userId: 'someone-else' });
    await expect(
      service.createPayment(dtoFor(other.id), USER, ctx),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('nhận VNPAY_PAYMENT_URL (tên chính), VNPAY_URL (tên cũ) và có URL sandbox mặc định', async () => {
    const { VNPAY_URL: _legacy, ...withoutUrl } = BASE_ENV;
    const cases: Array<[Record<string, string>, string]> = [
      [
        { ...withoutUrl, VNPAY_PAYMENT_URL: 'https://a.example/pay' },
        'https://a.example/pay',
      ],
      [{ ...withoutUrl, VNPAY_URL: 'https://b.example/pay' }, 'https://b.example/pay'],
      [withoutUrl, 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'],
    ];

    for (const [env, expected] of cases) {
      const { service, db } = makeService(env);
      const order = addOrder(db);
      const res = await service.createPayment(dtoFor(order.id), USER, {
        ipAddr: '127.0.0.1',
      });
      const url = new URL(res.paymentUrl as string);
      expect(url.origin + url.pathname).toBe(expected);
    }
  });

  it('thiếu cấu hình VNPay => 500 với thông báo rõ ràng', async () => {
    const { service, db } = makeService({});
    const order = addOrder(db);

    await expect(
      service.createPayment(dtoFor(order.id), USER, { ipAddr: '127.0.0.1' }),
    ).rejects.toMatchObject({ status: 500 });
  });
});

describe('VnpayService.processCallback (IPN / Return)', () => {
  async function setup(orderPatch: Partial<Order> = {}) {
    const ctx = makeService(BASE_ENV);
    const order = addOrder(ctx.db, orderPatch);
    await ctx.service.createPayment(dtoFor(order.id), USER, {
      ipAddr: '127.0.0.1',
    });
    const payment = ctx.db.tables.get(Payment)![0] as unknown as Payment;
    return { ...ctx, order, payment };
  }

  it('thành công: payment và order đều PAID, trả RspCode 00', async () => {
    const { service, order, payment } = await setup();

    const res = await service.processCallback(signedCallback(payment));

    expect(res.rspCode).toBe('00');
    expect(payment.status).toBe(PaymentStatus.PAID);
    expect(payment.vnpTransactionNo).toBe('14000001');
    expect(payment.responseCode).toBe('00');
    expect(order.status).toBe(OrderStatus.PAID);
  });

  it('idempotent: IPN rồi Return cùng kết quả => lần 2 trả 02, không đổi gì', async () => {
    const { service, order, payment } = await setup();
    const query = signedCallback(payment);

    expect((await service.processCallback(query)).rspCode).toBe('00');
    const second = await service.processCallback(query);

    expect(second.rspCode).toBe('02');
    expect(payment.status).toBe(PaymentStatus.PAID);
    expect(order.status).toBe(OrderStatus.PAID);
  });

  it('khách hủy (24): payment và order PAYMENT_FAILED', async () => {
    const { service, order, payment } = await setup();

    const res = await service.processCallback(
      signedCallback(payment, {
        vnp_ResponseCode: '24',
        vnp_TransactionStatus: '02',
      }),
    );

    expect(res.rspCode).toBe('00'); // đã ghi nhận kết quả
    expect(payment.status).toBe(PaymentStatus.PAYMENT_FAILED);
    expect(payment.responseCode).toBe('24');
    expect(order.status).toBe(OrderStatus.PAYMENT_FAILED);
  });

  it('chữ ký sai => 97 và không đổi trạng thái', async () => {
    const { service, order, payment } = await setup();

    const res = await service.processCallback(
      signedCallback(payment, {}, 'WRONGSECRET'),
    );

    expect(res.rspCode).toBe('97');
    expect(payment.status).toBe(PaymentStatus.PENDING);
    expect(order.status).toBe(OrderStatus.PENDING);
  });

  it('số tiền không khớp (dù chữ ký hợp lệ) => 04', async () => {
    const { service, order, payment } = await setup();

    const res = await service.processCallback(
      signedCallback(payment, { vnp_Amount: '100' }),
    );

    expect(res.rspCode).toBe('04');
    expect(payment.status).toBe(PaymentStatus.PENDING);
    expect(order.status).toBe(OrderStatus.PENDING);
  });

  it('không tìm thấy vnp_TxnRef => 01', async () => {
    const { service } = await setup();

    const res = await service.processCallback(
      signedCallback({ txnRef: 'khongtontai', amount: 123000 }),
    );

    expect(res.rspCode).toBe('01');
  });

  it('thiếu vnp_TxnRef (không được khớp bừa bản ghi đầu tiên) => 01', async () => {
    const { service } = await setup();
    const params = { vnp_ResponseCode: '00', vnp_Amount: '12300000' };
    const query = {
      ...params,
      vnp_SecureHash: signVnpay(toSignData(params), SECRET),
    };

    expect((await service.processCallback(query)).rspCode).toBe('01');
  });

  it('đơn đã PAID bằng giao dịch khác: ghi nhận payment, KHÔNG đổi đơn', async () => {
    const { service, order, payment } = await setup();
    order.status = OrderStatus.PAID; // vd: đã trả bằng Mock Bank

    const res = await service.processCallback(signedCallback(payment));

    expect(res.rspCode).toBe('00');
    expect(payment.status).toBe(PaymentStatus.PAID);
    expect(order.status).toBe(OrderStatus.PAID);
  });
});

describe('VnpayService.handleReturn / handleIpn / toView', () => {
  it('Return: trả JSON khi chưa cấu hình VNPAY_RESULT_REDIRECT_URL', async () => {
    const ctx = makeService(BASE_ENV);
    const order = addOrder(ctx.db);
    await ctx.service.createPayment(dtoFor(order.id), USER, {
      ipAddr: '127.0.0.1',
    });
    const payment = ctx.db.tables.get(Payment)![0] as unknown as Payment;

    const { body, redirectUrl } = await ctx.service.handleReturn(
      signedCallback(payment),
    );

    expect(redirectUrl).toBeNull();
    expect(body).toMatchObject({
      success: true,
      status: 'PAID',
      orderId: order.id,
    });
  });

  it('Return: redirect về frontend khi có VNPAY_RESULT_REDIRECT_URL', async () => {
    const ctx = makeService({
      ...BASE_ENV,
      VNPAY_RESULT_REDIRECT_URL: 'http://localhost:3000/payment/result',
    });
    const order = addOrder(ctx.db);
    await ctx.service.createPayment(dtoFor(order.id), USER, {
      ipAddr: '127.0.0.1',
    });
    const payment = ctx.db.tables.get(Payment)![0] as unknown as Payment;

    const { redirectUrl } = await ctx.service.handleReturn(
      signedCallback(payment, {
        vnp_ResponseCode: '24',
        vnp_TransactionStatus: '02',
      }),
    );

    const url = new URL(redirectUrl as string);
    expect(url.origin + url.pathname).toBe('http://localhost:3000/payment/result');
    expect(url.searchParams.get('status')).toBe('PAYMENT_FAILED');
    expect(url.searchParams.get('orderId')).toBe(order.id);
  });

  it('Return: chữ ký sai => status INVALID', async () => {
    const { service } = makeService(BASE_ENV);

    const { body } = await service.handleReturn({
      vnp_TxnRef: 'abc',
      vnp_SecureHash: 'deadbeef',
    });

    expect(body).toMatchObject({ success: false, status: 'INVALID' });
  });

  it('IPN: luôn trả {RspCode, Message}, kể cả khi lỗi bất ngờ => 99', async () => {
    const { service } = makeService(BASE_ENV);
    jest
      .spyOn(service, 'processCallback')
      .mockRejectedValueOnce(new Error('db down'));

    expect(await service.handleIpn({})).toEqual({
      RspCode: '99',
      Message: 'Unknown error',
    });
  });

  it('toView: đã thanh toán hoặc hết hạn thì không trả paymentUrl/qrCode', async () => {
    const ctx = makeService(BASE_ENV);
    const order = addOrder(ctx.db);
    await ctx.service.createPayment(dtoFor(order.id), USER, {
      ipAddr: '127.0.0.1',
    });
    const payment = ctx.db.tables.get(Payment)![0] as unknown as Payment;

    expect(await ctx.service.toView(payment)).toHaveProperty('qrCode');

    payment.status = PaymentStatus.PAID;
    expect(await ctx.service.toView(payment)).not.toHaveProperty('qrCode');

    payment.status = PaymentStatus.PENDING;
    payment.createdAt = new Date(Date.now() - 30 * 60_000);
    const expired = await ctx.service.toView(payment);
    expect(expired).not.toHaveProperty('paymentUrl');
    expect(expired).not.toHaveProperty('qrCode');
  });
});
