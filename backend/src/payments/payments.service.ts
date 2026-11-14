
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
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { DataSource, Repository } from 'typeorm';

import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderStateMachineService } from '../orders/services/order-state-machine.service';

import { IngredientInventoryService } from '../inventory/ingredient-inventory.service';

import { User } from '../users/entities/user.entity';
import {
  LoyaltyTransaction,
  LoyaltyTransactionType,
} from '../loyalty/entities/loyalty-transaction.entity';

import {
  Payment,
  PaymentProvider,
  PaymentStatus,
} from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

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

    private readonly orderStateMachine: OrderStateMachineService,
    private readonly ingredientInventoryService: IngredientInventoryService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async createPayment(
    dto: CreatePaymentDto,
    userId: string,
    idempotencyKey: string,
  ) {
    // 1. Kiểm tra Idempotency-Key.
    if (
      !idempotencyKey ||
      idempotencyKey.length < 8 ||
      idempotencyKey.length > 128
    ) {
      throw new BadRequestException(
        'Header Idempotency-Key là bắt buộc (8–128 ký tự)',
      );
    }

    if (dto.provider !== PaymentProvider.MOCK) {
      throw new BadRequestException(
        'Hiện tại chỉ hỗ trợ Mock Bank',
      );
    }

    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          orderId: dto.orderId,
          method: dto.method,
          provider: dto.provider,
        }),
      )
      .digest('hex');

    // 2. Kiểm tra giao dịch đã tồn tại theo Idempotency-Key.
    let payment: Payment | null =
      await this.paymentRepository.findOne({
        where: { userId, idempotencyKey },
      });

    if (payment) {
      if (payment.requestHash !== requestHash) {
        throw new ConflictException(
          'Idempotency-Key đã được dùng cho nội dung yêu cầu khác',
        );
      }

      if (payment.status !== PaymentStatus.PENDING) {
        return await this.paymentResult(payment, true);
      }
    } else {
      try {
        payment = await this.dataSource.transaction(
          async (manager) => {
            const order = await manager.findOne(Order, {
              where: {
                id: dto.orderId,
                userId,
              },
              lock: { mode: 'pessimistic_write' },
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

            // 3. Nếu thanh toán lại sau thất bại,
            // giữ nguyên liệu lại trước khi thử thanh toán.
            if (order.status === OrderStatus.PAYMENT_FAILED) {
              const orderItems = await manager.find(OrderItem, {
                where: { orderId: order.id },
              });

              await this.ingredientInventoryService.reserveIngredients(
                manager,
                order.id,
                orderItems,
              );

              order.status = this.orderStateMachine.transition(
                order.status,
                OrderStatus.PENDING,
              );

              await manager.save(Order, order);
            }

            if (
              !Number.isSafeInteger(order.total) ||
              order.total <= 0
            ) {
              throw new BadRequestException(
                'Tổng tiền đơn hàng không hợp lệ',
              );
            }

            // 4. Tạo giao dịch thanh toán.
            const row = manager.create(Payment, {
              orderId: order.id,
              userId,
              amount: order.total,
              method: dto.method,
              provider: PaymentProvider.MOCK,
              status: PaymentStatus.PENDING,
              idempotencyKey,
              requestHash,
              txnRef: `${Date.now()}-${randomBytes(4).toString('hex')}`,
              mockTransactionId: null,
              vnpTransactionNo: null,
              responseCode: null,
              paymentUrl: null,
            });

            return manager.save(Payment, row);
          },
        );
      } catch (error: any) {
        // Hai request đồng thời có thể cùng tạo một Idempotency-Key.
        // Nếu một request thắng, đọc lại giao dịch đã được tạo.
        if (
          error?.code !== '23505' &&
          error?.code !== 'SQLITE_CONSTRAINT_UNIQUE'
        ) {
          throw error;
        }

        payment = await this.paymentRepository.findOne({
          where: { userId, idempotencyKey },
        });

        if (!payment) {
          throw error;
        }

        if (payment.requestHash !== requestHash) {
          throw new ConflictException(
            'Idempotency-Key đã được dùng cho nội dung yêu cầu khác',
          );
        }

        if (payment.status !== PaymentStatus.PENDING) {
          return await this.paymentResult(payment, true);
        }
      }
    }

    if (!payment) {
      throw new InternalServerErrorException(
        'Không thể khởi tạo giao dịch thanh toán',
      );
    }

    // 5. Gọi Mock Bank bên ngoài transaction database.
    // Nếu kết quả mạng không xác định, giữ PENDING để retry an toàn.
    try {
      const bankResponse = await this.callMockBank(
        payment.orderId,
        payment.amount,
        idempotencyKey,
      );

      this.verifyMockBankResponse(
        bankResponse,
        payment.orderId,
        payment.amount,
      );

      const result = await this.updatePaymentResult(
        payment.id,
        bankResponse,
      );

      return {
        ...result,
        idempotentReplay: false,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Chưa xác định được kết quả từ Mock Bank; hãy thử lại với cùng Idempotency-Key',
      );
    }
  }

  // Trả kết quả của giao dịch đã được xử lý trước đó.
  private async paymentResult(
    payment: Payment,
    replay: boolean,
  ) {
    const order = await this.dataSource
      .getRepository(Order)
      .findOne({
        where: { id: payment.orderId },
      });

    return {
      message:
        payment.status === PaymentStatus.PAID
          ? 'Thanh toán đã thành công trước đó'
          : payment.status === PaymentStatus.PAYMENT_FAILED
            ? 'Giao dịch trước đó đã thất bại; hãy tạo yêu cầu mới với Idempotency-Key mới'
            : 'Yêu cầu thanh toán đang được xử lý',

      paymentId: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,

      orderStatus:
        payment.status === PaymentStatus.PAID
          ? OrderStatus.PAID
          : undefined,

      mockTransactionId: payment.mockTransactionId,
      rewardPointsEarned: order?.rewardPointsEarned ?? 0,
      pointsRedeemed: order?.pointsRedeemed ?? 0,
      pointsDiscountAmount: order?.pointsDiscountAmount ?? 0,
      idempotentReplay: replay,
      simulated: true,
    };
  }

  // Gửi yêu cầu thanh toán đến Mock Bank.
  private async callMockBank(
    orderId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<MockBankResponse> {
    const bankUrl =
      this.configService.get<string>('MOCK_BANK_URL');

    const apiKey =
      this.configService.get<string>('MOCK_BANK_API_KEY');

    if (!bankUrl || !apiKey) {
      throw new InternalServerErrorException(
        'Chưa cấu hình Mock Bank',
      );
    }

    const configured = this.configService
      .get<string>('MOCK_PAYMENT_RESULT', 'SUCCESS')
      .toUpperCase();

    if (!['SUCCESS', 'FAILURE'].includes(configured)) {
      throw new BadRequestException(
        'MOCK_PAYMENT_RESULT chỉ nhận SUCCESS hoặc FAILURE',
      );
    }

    const response = await fetch(
      `${bankUrl.replace(/\/$/, '')}/payments/charge`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          orderId,
          amount,
          simulateResult:
            configured === 'FAILURE' ? 'FAILED' : 'SUCCESS',
        }),
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Mock Bank trả về HTTP ${response.status}`,
      );
    }

    return (await response.json()) as MockBankResponse;
  }

  // Xác minh chữ ký HMAC từ Mock Bank.
  private verifyMockBankResponse(
    response: MockBankResponse,
    orderId: string,
    amount: number,
  ) {
    const secret =
      this.configService.get<string>('MOCK_BANK_SECRET');

    if (!secret) {
      throw new InternalServerErrorException(
        'MOCK_BANK_SECRET chưa được cấu hình',
      );
    }

    if (
      !response ||
      response.orderId !== orderId ||
      response.amount !== amount ||
      typeof response.transactionId !== 'string' ||
      !response.transactionId ||
      !['SUCCESS', 'FAILED'].includes(response.status) ||
      Number.isNaN(Date.parse(response.processedAt)) ||
      !/^[a-fA-F0-9]{64}$/.test(response.signature ?? '')
    ) {
      throw new BadRequestException(
        'Dữ liệu trả về từ Mock Bank không hợp lệ',
      );
    }

    const data = {
      orderId: response.orderId,
      transactionId: response.transactionId,
      amount: response.amount,
      status: response.status,
      processedAt: response.processedAt,
    };

    const expected = createHmac('sha256', secret)
      .update(JSON.stringify(data))
      .digest();

    const received = Buffer.from(
      response.signature,
      'hex',
    );

    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      throw new BadRequestException(
        'Xác minh chữ ký Mock Bank thất bại',
      );
    }
  }

  // Cập nhật kết quả thanh toán và điểm thưởng trong cùng transaction.
  private async updatePaymentResult(
    paymentId: string,
    bank: MockBankResponse,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!payment) {
        throw new NotFoundException(
          'Không tìm thấy giao dịch',
        );
      }

      // Chống xử lý lại giao dịch đã hoàn tất.
      if (payment.status !== PaymentStatus.PENDING) {
        return await this.paymentResult(payment, true);
      }

      const order = await manager.findOne(Order, {
        where: { id: payment.orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException(
          'Không tìm thấy đơn hàng',
        );
      }

      const isSuccess = bank.status === 'SUCCESS';

      payment.status = isSuccess
        ? PaymentStatus.PAID
        : PaymentStatus.PAYMENT_FAILED;

      payment.mockTransactionId = bank.transactionId;

      payment.responseCode = isSuccess
        ? 'MOCK_SUCCESS'
        : 'MOCK_FAILURE';

      if (isSuccess) {
        // 1. Thanh toán thành công: tiêu thụ nguyên liệu đã giữ.
        await this.ingredientInventoryService.consumeIngredients(
          manager,
          order.id,
        );

        order.status = this.orderStateMachine.transition(
          order.status,
          OrderStatus.PAID,
        );

        // 2. Xử lý điểm thưởng.
        const user = await manager.findOne(User, {
          where: { id: order.userId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!user) {
          throw new NotFoundException(
            'Không tìm thấy tài khoản của đơn hàng',
          );
        }

        // Chỉ xử lý điểm một lần cho mỗi đơn hàng.
        if (!order.loyaltyAwardedAt) {
          const pointsToSpend = order.pointsRedeemed ?? 0;

          if (
            (user.loyaltyPoints ?? 0) < pointsToSpend
          ) {
            throw new ConflictException(
              'Số dư điểm thưởng không đủ để hoàn tất đơn hàng này',
            );
          }

          // Trừ điểm đã sử dụng.
          if (pointsToSpend > 0) {
            user.loyaltyPoints =
              (user.loyaltyPoints ?? 0) - pointsToSpend;

            await manager.save(
              LoyaltyTransaction,
              manager.create(LoyaltyTransaction, {
                userId: user.id,
                orderId: order.id,
                points: pointsToSpend,
                type: LoyaltyTransactionType.REDEEM,
                description: `Sử dụng điểm cho đơn hàng ${order.id}`,
              }),
            );
          }

          // Cộng 5% điểm trên số tiền thực tế đã thanh toán.
          const earnedPoints = Math.floor(
            payment.amount * 0.05,
          );

          if (earnedPoints > 0) {
            user.loyaltyPoints =
              (user.loyaltyPoints ?? 0) + earnedPoints;

            await manager.save(
              LoyaltyTransaction,
              manager.create(LoyaltyTransaction, {
                userId: user.id,
                orderId: order.id,
                points: earnedPoints,
                type: LoyaltyTransactionType.EARN,
                description: `Tích 5% điểm từ số tiền thanh toán đơn hàng ${order.id}`,
              }),
            );
          }

          await manager.save(User, user);

          order.rewardPointsEarned = earnedPoints;
          order.loyaltyAwardedAt = new Date();
        }
      } else {
        // Thanh toán thất bại: giải phóng nguyên liệu đã giữ.
        await this.ingredientInventoryService.releaseIngredients(
          manager,
          order.id,
        );

        if (order.status === OrderStatus.PENDING) {
          order.status = this.orderStateMachine.transition(
            order.status,
            OrderStatus.PAYMENT_FAILED,
          );
        }
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
        mockTransactionId: savedPayment.mockTransactionId,
        responseCode: savedPayment.responseCode,
        rewardPointsEarned: order.rewardPointsEarned,
        pointsRedeemed: order.pointsRedeemed,
        pointsDiscountAmount: order.pointsDiscountAmount,
        simulated: true,
      };
    });
  }

  // Lấy thông tin một giao dịch theo tài khoản hiện tại.
  async getPayment(paymentId: string, userId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, userId },
    });

    if (!payment) {
      throw new NotFoundException(
        'Không tìm thấy giao dịch',
      );
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
}
