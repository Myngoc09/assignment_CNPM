
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import { DataSource, Repository } from 'typeorm';

import {
  Order,
  OrderStatus,
} from '../orders/entities/order.entity';

import {
  Payment,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from './entities/payment.entity';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { VnpayCreateContext, VnpayService } from './vnpay.service';

// Idempotency-Key: 8–100 ký tự chữ, số, '-', '_', ':', '.'
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9\-_:.]{8,100}$/;

interface MockBankResponse {
  orderId: string;
  transactionId: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED';
  processedAt: string;
  signature: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    private readonly dataSource: DataSource,

    private readonly configService: ConfigService,

    private readonly vnpayService: VnpayService,
  ) {}

  // =====================================================
  // 1. TẠO GIAO DỊCH
  // =====================================================

  async createPayment(
    dto: CreatePaymentDto,
    userId: string,
    ctx: Partial<VnpayCreateContext> = {},
  ) {
    if (
      ctx.idempotencyKey !== undefined &&
      !IDEMPOTENCY_KEY_PATTERN.test(ctx.idempotencyKey)
    ) {
      throw new BadRequestException(
        'Idempotency-Key không hợp lệ (8–100 ký tự: chữ, số, - _ : .)',
      );
    }

    // VNPay Sandbox: bất đồng bộ, trả paymentUrl + mã QR.
    if (dto.provider === PaymentProvider.VNPAY) {
      return this.vnpayService.createPayment(dto, userId, {
        ipAddr: ctx.ipAddr ?? '127.0.0.1',
        idempotencyKey: ctx.idempotencyKey,
      });
    }

    // Mock Bank: đồng bộ, có kết quả ngay.
    // (Idempotency-Key cho Mock Bank sẽ làm ở Task 10.)
    if (dto.provider !== PaymentProvider.MOCK) {
      throw new BadRequestException(
        'Provider không được hỗ trợ',
      );
    }

    // Bước 1: Tạo Payment PENDING trong database.
    // Không gọi Mock Bank khi đang giữ transaction.
    const pendingPayment = await this.dataSource.transaction(
      async (manager) => {
        const order = await manager.findOne(Order, {
          where: {
            id: dto.orderId,
            userId,
          },
          lock: {
            mode: 'pessimistic_write',
          },
        });

        if (!order) {
          throw new NotFoundException(
            'Không tìm thấy đơn hàng của tài khoản này',
          );
        }

        if (order.status === OrderStatus.PAID) {
          throw new ConflictException(
            'Đơn hàng đã được thanh toán',
          );
        }

        if (
          order.status !== OrderStatus.PENDING &&
          order.status !== OrderStatus.PAYMENT_FAILED
        ) {
          throw new ConflictException(
            'Đơn hàng không thể thanh toán ở trạng thái hiện tại',
          );
        }

        if (
          !Number.isSafeInteger(order.total) ||
          order.total <= 0
        ) {
          throw new BadRequestException(
            'Tổng tiền đơn hàng không hợp lệ',
          );
        }

        const txnRef =
          `${Date.now()}-${randomBytes(4).toString('hex')}`;

        const payment = manager.create(Payment, {
          orderId: order.id,
          userId,
          amount: order.total,
          method: dto.method,
          provider: PaymentProvider.MOCK,
          status: PaymentStatus.PENDING,
          txnRef,
          mockTransactionId: null,
          vnpTransactionNo: null,
          responseCode: null,
          paymentUrl: null,
        });

        const savedPayment = await manager.save(
          Payment,
          payment,
        );

        return {
          paymentId: savedPayment.id,
          orderId: savedPayment.orderId,
          amount: savedPayment.amount,
          method: savedPayment.method,
          transactionRef: savedPayment.txnRef,
        };
      },
    );

    // Bước 2: Gọi Mock Bank bên ngoài transaction database.
    try {
      const bankResponse = await this.callMockBank(
        pendingPayment.orderId,
        pendingPayment.amount,
      );

      // Bước 3: Xác minh kết quả Mock Bank.
      this.verifyMockBankResponse(
        bankResponse,
        pendingPayment.orderId,
        pendingPayment.amount,
      );

      // Bước 4: Cập nhật database sau khi xác minh.
      return await this.updatePaymentResult(
        pendingPayment.paymentId,
        bankResponse,
      );
    } catch (error) {
      // Nếu Mock Bank lỗi hoặc trả kết quả không hợp lệ,
      // không được tự ý đánh dấu đơn hàng đã thanh toán.
      await this.markPaymentFailed(
        pendingPayment.paymentId,
      );

      throw new InternalServerErrorException(
        'Không thể xác nhận thanh toán từ Mock Bank',
      );
    }
  }

  // =====================================================
  // 2. GỌI MOCK BANK
  // =====================================================

  private async callMockBank(
    orderId: string,
    amount: number,
  ): Promise<MockBankResponse> {
    const bankUrl = this.configService.get<string>(
      'MOCK_BANK_URL',
    );

    const apiKey = this.configService.get<string>(
      'MOCK_BANK_API_KEY',
    );

    if (!bankUrl || !apiKey) {
      throw new InternalServerErrorException(
        'Chưa cấu hình Mock Bank',
      );
    }

    const configuredResult = this.getMockResult();

    const simulateResult =
      configuredResult === 'FAILURE'
        ? 'FAILED'
        : configuredResult;

    const response = await fetch(
      `${bankUrl.replace(/\/$/, '')}/payments/charge`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },

        body: JSON.stringify({
          orderId,
          amount,
          simulateResult,
        }),

        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Mock Bank trả về HTTP ${response.status}`,
      );
    }

    return await response.json() as MockBankResponse;
  }

  // =====================================================
  // 3. XÁC MINH CHỮ KÝ MOCK BANK
  // =====================================================

  private verifyMockBankResponse(
    response: MockBankResponse,
    expectedOrderId: string,
    expectedAmount: number,
  ): void {
    const secret = this.configService.get<string>(
      'MOCK_BANK_SECRET',
    );

    if (!secret) {
      throw new InternalServerErrorException(
        'MOCK_BANK_SECRET chưa được cấu hình',
      );
    }

    if (
      !response ||
      response.orderId !== expectedOrderId ||
      response.amount !== expectedAmount ||
      typeof response.transactionId !== 'string' ||
      response.transactionId.length === 0 ||
      typeof response.processedAt !== 'string' ||
      Number.isNaN(Date.parse(response.processedAt)) ||
      !['SUCCESS', 'FAILED'].includes(response.status)
    ) {
      throw new BadRequestException(
        'Dữ liệu trả về từ Mock Bank không hợp lệ',
      );
    }

    if (
      typeof response.signature !== 'string' ||
      !/^[a-fA-F0-9]{64}$/.test(response.signature)
    ) {
      throw new BadRequestException(
        'Chữ ký Mock Bank không hợp lệ',
      );
    }

    // Phải giữ đúng thứ tự thuộc tính giống Mock Bank.
    const paymentData = {
      orderId: response.orderId,
      transactionId: response.transactionId,
      amount: response.amount,
      status: response.status,
      processedAt: response.processedAt,
    };

    const calculatedSignature = createHmac(
      'sha256',
      secret,
    )
      .update(JSON.stringify(paymentData))
      .digest('hex');

    const received = Buffer.from(
      response.signature,
      'hex',
    );

    const calculated = Buffer.from(
      calculatedSignature,
      'hex',
    );

    const isValid =
      received.length === calculated.length &&
      timingSafeEqual(received, calculated);

    if (!isValid) {
      throw new BadRequestException(
        'Xác minh chữ ký Mock Bank thất bại',
      );
    }
  }

  // =====================================================
  // 4. CẬP NHẬT KẾT QUẢ THANH TOÁN
  // =====================================================

  private async updatePaymentResult(
    paymentId: string,
    bankResponse: MockBankResponse,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: {
          id: paymentId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!payment) {
        throw new NotFoundException(
          'Không tìm thấy giao dịch',
        );
      }

      // Chống xử lý lại giao dịch đã hoàn tất.
      if (payment.status !== PaymentStatus.PENDING) {
        return {
          paymentId: payment.id,
          orderId: payment.orderId,
          status: payment.status,
          mockTransactionId: payment.mockTransactionId,
          message: 'Giao dịch đã được xử lý trước đó',
        };
      }

      const order = await manager.findOne(Order, {
        where: {
          id: payment.orderId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!order) {
        throw new NotFoundException(
          'Không tìm thấy đơn hàng',
        );
      }

      const isSuccess =
        bankResponse.status === 'SUCCESS';

      payment.status = isSuccess
        ? PaymentStatus.PAID
        : PaymentStatus.PAYMENT_FAILED;

      payment.mockTransactionId =
        bankResponse.transactionId;

      payment.responseCode = isSuccess
        ? 'MOCK_SUCCESS'
        : 'MOCK_FAILURE';

      if (isSuccess) {
        order.status = OrderStatus.PAID;
      } else if (order.status === OrderStatus.PENDING) {
        order.status = OrderStatus.PAYMENT_FAILED;
      }

      const savedPayment = await manager.save(
        Payment,
        payment,
      );

      await manager.save(Order, order);

      return {
        message: isSuccess
          ? 'Thanh toán Mock Bank thành công'
          : 'Thanh toán Mock Bank thất bại',

        paymentId: savedPayment.id,
        orderId: order.id,
        amount: savedPayment.amount,
        method: savedPayment.method,
        provider: savedPayment.provider,
        status: savedPayment.status,
        orderStatus: order.status,
        transactionRef: savedPayment.txnRef,
        mockTransactionId:
          savedPayment.mockTransactionId,
        responseCode: savedPayment.responseCode,
        simulated: true,
      };
    });
  }

  // =====================================================
  // 5. ĐÁNH DẤU THANH TOÁN THẤT BẠI KHI CÓ LỖI
  // =====================================================

  private async markPaymentFailed(
    paymentId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: {
          id: paymentId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (
        !payment ||
        payment.status !== PaymentStatus.PENDING
      ) {
        return;
      }

      const order = await manager.findOne(Order, {
        where: {
          id: payment.orderId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      payment.status = PaymentStatus.PAYMENT_FAILED;
      payment.responseCode = 'MOCK_BANK_ERROR';

      await manager.save(Payment, payment);

      if (order && order.status === OrderStatus.PENDING) {
        order.status = OrderStatus.PAYMENT_FAILED;
        await manager.save(Order, order);
      }
    });
  }

  // =====================================================
  // 6. XEM CHI TIẾT GIAO DỊCH
  // =====================================================

  async getPayment(
    paymentId: string,
    userId: string,
  ) {
    const payment = await this.paymentRepository.findOne({
      where: {
        id: paymentId,
        userId,
      },
    });

    if (!payment) {
      throw new NotFoundException(
        'Không tìm thấy giao dịch',
      );
    }

    // VNPay: kèm paymentUrl + qrCode khi còn chờ thanh toán
    // (frontend polling endpoint này để biết khi nào đã thanh toán xong).
    if (payment.provider === PaymentProvider.VNPAY) {
      return this.vnpayService.toView(payment);
    }

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      method: payment.method,
      provider: payment.provider,
      status: payment.status,
      transactionRef: payment.txnRef,
      mockTransactionId: payment.mockTransactionId,
      responseCode: payment.responseCode,
      simulated: true,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  // =====================================================
  // 7. LẤY KẾT QUẢ MÔ PHỎNG TỪ FILE .ENV
  // =====================================================

  private getMockResult(): 'SUCCESS' | 'FAILURE' {
    const result = this.configService
      .get<string>('MOCK_PAYMENT_RESULT', 'SUCCESS')
      .toUpperCase();

    if (result === 'SUCCESS' || result === 'FAILURE') {
      return result;
    }

    throw new BadRequestException(
      'MOCK_PAYMENT_RESULT chỉ nhận SUCCESS hoặc FAILURE',
    );
  }
}
