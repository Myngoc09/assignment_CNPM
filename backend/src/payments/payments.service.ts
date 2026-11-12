import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderStateMachineService } from '../orders/services/order-state-machine.service';
import { User } from '../users/entities/user.entity';
import { LoyaltyTransaction, LoyaltyTransactionType } from '../loyalty/entities/loyalty-transaction.entity';
import { Payment, PaymentProvider, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

interface MockBankResponse { orderId: string; transactionId: string; amount: number; status: 'SUCCESS' | 'FAILED'; processedAt: string; signature: string; }

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly paymentRepository: Repository<Payment>,
    private readonly orderStateMachine: OrderStateMachineService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async createPayment(dto: CreatePaymentDto, userId: string, idempotencyKey: string) {
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
      throw new BadRequestException('Header Idempotency-Key là bắt buộc (8–128 ký tự)');
    }
    if (dto.provider !== PaymentProvider.MOCK) throw new BadRequestException('Hiện tại chỉ hỗ trợ Mock Bank');
    const requestHash = createHash('sha256').update(JSON.stringify({ orderId: dto.orderId, method: dto.method, provider: dto.provider })).digest('hex');

    let payment: Payment | null = await this.paymentRepository.findOne({ where: { userId, idempotencyKey } });
    if (payment) {
      if (payment.requestHash !== requestHash) throw new ConflictException('Idempotency-Key đã được dùng cho nội dung yêu cầu khác');
      if (payment.status !== PaymentStatus.PENDING) return await this.paymentResult(payment, true);
    } else {
      try {
        payment = await this.dataSource.transaction(async (manager) => {
          const order = await manager.findOne(Order, { where: { id: dto.orderId, userId }, lock: { mode: 'pessimistic_write' } });
          if (!order) throw new NotFoundException('Không tìm thấy đơn hàng của tài khoản này');
          if (order.status === OrderStatus.PAID) throw new ConflictException('Đơn hàng đã được thanh toán');
          if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAYMENT_FAILED) throw new ConflictException('Đơn hàng không thể thanh toán ở trạng thái hiện tại');
          if (order.status === OrderStatus.PAYMENT_FAILED) {
            order.status = this.orderStateMachine.transition(order.status, OrderStatus.PENDING);
            await manager.save(Order, order);
          }
          if (!Number.isSafeInteger(order.total) || order.total <= 0) throw new BadRequestException('Tổng tiền đơn hàng không hợp lệ');
          const row = manager.create(Payment, {
            orderId: order.id, userId, amount: order.total, method: dto.method, provider: PaymentProvider.MOCK,
            status: PaymentStatus.PENDING, idempotencyKey, requestHash,
            txnRef: `${Date.now()}-${randomBytes(4).toString('hex')}`,
            mockTransactionId: null, vnpTransactionNo: null, responseCode: null, paymentUrl: null,
          });
          return manager.save(Payment, row);
        });
      } catch (error: any) {
        // Two concurrent requests may race to insert the same unique key. Re-read the winner.
        if (error?.code !== '23505' && error?.code !== 'SQLITE_CONSTRAINT_UNIQUE') throw error;
        payment = await this.paymentRepository.findOne({ where: { userId, idempotencyKey } });
        if (!payment) throw error;
        if (payment.requestHash !== requestHash) throw new ConflictException('Idempotency-Key đã được dùng cho nội dung yêu cầu khác');
        if (payment.status !== PaymentStatus.PENDING) return await this.paymentResult(payment, true);
      }
    }

    if (!payment) throw new InternalServerErrorException('Không thể khởi tạo giao dịch thanh toán');

    // A retry of a PENDING row sends the same key to Mock Bank. The bank must replay
    // the original response rather than creating a second charge.
    try {
      const bankResponse = await this.callMockBank(payment.orderId, payment.amount, idempotencyKey);
      this.verifyMockBankResponse(bankResponse, payment.orderId, payment.amount);
      const result = await this.updatePaymentResult(payment.id, bankResponse);
      return { ...result, idempotentReplay: false };
    } catch (error) {
      // Keep the payment PENDING when the network outcome is unknown. A retry with
      // the same Idempotency-Key asks Mock Bank for the original result safely.
      if (error instanceof BadRequestException || error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Chưa xác định được kết quả từ Mock Bank; hãy thử lại với cùng Idempotency-Key');
    }
  }

  private async paymentResult(payment: Payment, replay: boolean) {
    const order = await this.dataSource.getRepository(Order).findOne({ where: { id: payment.orderId } });
    return { message: payment.status === PaymentStatus.PAID ? 'Thanh toán đã thành công trước đó' : payment.status === PaymentStatus.PAYMENT_FAILED ? 'Giao dịch trước đó đã thất bại; hãy tạo yêu cầu mới với Idempotency-Key mới' : 'Yêu cầu thanh toán đang được xử lý', paymentId: payment.id, orderId: payment.orderId, amount: payment.amount, method: payment.method, status: payment.status, orderStatus: payment.status === PaymentStatus.PAID ? OrderStatus.PAID : undefined, mockTransactionId: payment.mockTransactionId, rewardPointsEarned: order?.rewardPointsEarned ?? 0, idempotentReplay: replay, simulated: true };
  }

  private async callMockBank(orderId: string, amount: number, idempotencyKey: string): Promise<MockBankResponse> {
    const bankUrl = this.configService.get<string>('MOCK_BANK_URL');
    const apiKey = this.configService.get<string>('MOCK_BANK_API_KEY');
    if (!bankUrl || !apiKey) throw new InternalServerErrorException('Chưa cấu hình Mock Bank');
    const configured = this.configService.get<string>('MOCK_PAYMENT_RESULT', 'SUCCESS').toUpperCase();
    if (!['SUCCESS', 'FAILURE'].includes(configured)) throw new BadRequestException('MOCK_PAYMENT_RESULT chỉ nhận SUCCESS hoặc FAILURE');
    const response = await fetch(`${bankUrl.replace(/\/$/, '')}/payments/charge`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ orderId, amount, simulateResult: configured === 'FAILURE' ? 'FAILED' : 'SUCCESS' }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Mock Bank trả về HTTP ${response.status}`);
    return await response.json() as MockBankResponse;
  }

  private verifyMockBankResponse(response: MockBankResponse, orderId: string, amount: number) {
    const secret = this.configService.get<string>('MOCK_BANK_SECRET');
    if (!secret) throw new InternalServerErrorException('MOCK_BANK_SECRET chưa được cấu hình');
    if (!response || response.orderId !== orderId || response.amount !== amount || typeof response.transactionId !== 'string' || !response.transactionId || !['SUCCESS', 'FAILED'].includes(response.status) || Number.isNaN(Date.parse(response.processedAt)) || !/^[a-fA-F0-9]{64}$/.test(response.signature ?? '')) throw new BadRequestException('Dữ liệu trả về từ Mock Bank không hợp lệ');
    const data = { orderId: response.orderId, transactionId: response.transactionId, amount: response.amount, status: response.status, processedAt: response.processedAt };
    const expected = createHmac('sha256', secret).update(JSON.stringify(data)).digest();
    const received = Buffer.from(response.signature, 'hex');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new BadRequestException('Xác minh chữ ký Mock Bank thất bại');
  }

  private async updatePaymentResult(paymentId: string, bank: MockBankResponse) {
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, { where: { id: paymentId }, lock: { mode: 'pessimistic_write' } });
      if (!payment) throw new NotFoundException('Không tìm thấy giao dịch');
      if (payment.status !== PaymentStatus.PENDING) return await this.paymentResult(payment, true);
      const order = await manager.findOne(Order, { where: { id: payment.orderId }, lock: { mode: 'pessimistic_write' } });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      const success = bank.status === 'SUCCESS';
      payment.status = success ? PaymentStatus.PAID : PaymentStatus.PAYMENT_FAILED;
      payment.mockTransactionId = bank.transactionId;
      payment.responseCode = success ? 'MOCK_SUCCESS' : 'MOCK_FAILURE';
      if (success) {
        order.status = this.orderStateMachine.transition(order.status, OrderStatus.PAID);
        const user = order.userId ? await manager.findOne(User, { where: { id: order.userId }, lock: { mode: 'pessimistic_write' } }) : null;
        if (user && !order.loyaltyAwardedAt) {
          const points = Math.floor(payment.amount / 10000);
          if (points > 0) {
            user.loyaltyPoints = (user.loyaltyPoints ?? 0) + points;
            await manager.save(User, user);
            await manager.save(LoyaltyTransaction, manager.create(LoyaltyTransaction, { userId: user.id, orderId: order.id, points, type: LoyaltyTransactionType.EARN, description: `Tích điểm từ đơn hàng ${order.id}` }));
          }
          order.rewardPointsEarned = points;
          order.loyaltyAwardedAt = new Date();
        }
      } else if (order.status === OrderStatus.PENDING) {
        order.status = this.orderStateMachine.transition(order.status, OrderStatus.PAYMENT_FAILED);
      }
      await manager.save(Payment, payment);
      await manager.save(Order, order);
      return { message: success ? 'Thanh toán Mock Bank thành công' : 'Thanh toán Mock Bank thất bại', paymentId: payment.id, orderId: order.id, amount: payment.amount, method: payment.method, provider: payment.provider, status: payment.status, orderStatus: order.status, transactionRef: payment.txnRef, mockTransactionId: payment.mockTransactionId, responseCode: payment.responseCode, rewardPointsEarned: order.rewardPointsEarned, simulated: true };
    });
  }


  async getPayment(paymentId: string, userId: string) {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId, userId } });
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch');
    return { paymentId: payment.id, orderId: payment.orderId, amount: payment.amount, method: payment.method, provider: payment.provider, status: payment.status, transactionRef: payment.txnRef, mockTransactionId: payment.mockTransactionId, responseCode: payment.responseCode, simulated: true, createdAt: payment.createdAt, updatedAt: payment.updatedAt };
  }
}
