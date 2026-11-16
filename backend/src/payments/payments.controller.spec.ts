import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { VnpayService } from './vnpay.service';

describe('PaymentsController (HTTP)', () => {
  let app: INestApplication;

  const paymentsService = {
    createPayment: jest.fn(),
    getPayment: jest.fn(),
  };
  const vnpayService = {
    handleIpn: jest.fn(),
    handleReturn: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: paymentsService },
        { provide: VnpayService, useValue: vnpayService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          context.switchToHttp().getRequest().user = {
            userId: 'user-1',
            email: 'a@b.c',
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    // Giống hệt cấu hình trong main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('GET /payments/vnpay/ipn: không bị route :id nuốt, không cần JWT, query lạ không bị chặn', async () => {
    vnpayService.handleIpn.mockResolvedValue({
      RspCode: '00',
      Message: 'Confirm Success',
    });

    const res = await request(app.getHttpServer())
      .get('/payments/vnpay/ipn')
      .query({ vnp_TxnRef: 'abc', vnp_Amount: '100', vnp_SecureHash: 'ff' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ RspCode: '00', Message: 'Confirm Success' });
    expect(vnpayService.handleIpn).toHaveBeenCalledWith(
      expect.objectContaining({ vnp_TxnRef: 'abc', vnp_Amount: '100' }),
    );
    expect(paymentsService.getPayment).not.toHaveBeenCalled();
  });

  it('GET /payments/vnpay/return: trả JSON khi không có redirectUrl', async () => {
    vnpayService.handleReturn.mockResolvedValue({
      body: { success: true, status: 'PAID', orderId: 'o1' },
      redirectUrl: null,
    });

    const res = await request(app.getHttpServer()).get(
      '/payments/vnpay/return?vnp_TxnRef=abc',
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, status: 'PAID' });
  });

  it('GET /payments/vnpay/return: redirect 302 khi có redirectUrl', async () => {
    vnpayService.handleReturn.mockResolvedValue({
      body: { success: true },
      redirectUrl: 'http://localhost:3000/payment/result?status=PAID',
    });

    const res = await request(app.getHttpServer())
      .get('/payments/vnpay/return?vnp_TxnRef=abc')
      .redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(
      'http://localhost:3000/payment/result?status=PAID',
    );
  });

  it('POST /payments: nhận provider VNPAY và truyền Idempotency-Key + IP xuống service', async () => {
    paymentsService.createPayment.mockResolvedValue({ status: 'PENDING' });

    const res = await request(app.getHttpServer())
      .post('/payments')
      .set('Idempotency-Key', 'key-0001-abcd')
      .send({
        orderId: '3f9a1b6e-8c0d-4b7a-9e1f-2a5d6c7b8e90',
        method: 'WALLET',
        provider: 'VNPAY',
      });

    expect(res.status).toBe(201);
    expect(paymentsService.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'VNPAY', method: 'WALLET' }),
      'user-1',
      expect.objectContaining({
        idempotencyKey: 'key-0001-abcd',
        ipAddr: expect.any(String),
      }),
    );
  });

  it('POST /payments: provider không hợp lệ => 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/payments')
      .send({
        orderId: '3f9a1b6e-8c0d-4b7a-9e1f-2a5d6c7b8e90',
        method: 'WALLET',
        provider: 'PAYPAL',
      });

    expect(res.status).toBe(400);
    expect(paymentsService.createPayment).not.toHaveBeenCalled();
  });
});
