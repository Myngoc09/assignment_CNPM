import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export interface MockBankResponse { orderId: string; transactionId: string; amount: number; status: 'SUCCESS' | 'FAILED'; processedAt: string; signature: string; }
interface CachedCharge { fingerprint: string; response: MockBankResponse; }

@Injectable()
export class PaymentsService {
  private readonly charges = new Map<string, CachedCharge>();

  processPayment(orderId: string, amount: number, idempotencyKey: string, simulateResult?: string) {
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) throw new ConflictException('Invalid Idempotency-Key');
    const fingerprint = `${orderId}:${amount}:${simulateResult ?? 'SUCCESS'}`;
    const cached = this.charges.get(idempotencyKey);
    if (cached) {
      if (cached.fingerprint !== fingerprint) throw new ConflictException('Idempotency-Key already used with different payment data');
      return cached.response;
    }
    const response = this.buildResponse(orderId, amount, simulateResult);
    this.charges.set(idempotencyKey, { fingerprint, response });
    return response;
  }

  private buildResponse(orderId: string, amount: number, simulateResult?: string): MockBankResponse {
    const secret = process.env.MOCK_BANK_SECRET;
    if (!secret) throw new InternalServerErrorException('MOCK_BANK_SECRET is not configured');
    const status: 'SUCCESS' | 'FAILED' = simulateResult === 'FAILED' ? 'FAILED' : 'SUCCESS';
    const paymentData = { orderId, transactionId: randomUUID(), amount, status, processedAt: new Date().toISOString() };
    const signature = createHmac('sha256', secret).update(JSON.stringify(paymentData)).digest('hex');
    return { ...paymentData, signature };
  }
}
