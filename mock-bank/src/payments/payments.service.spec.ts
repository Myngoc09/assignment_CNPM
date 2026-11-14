import { ConflictException } from '@nestjs/common';
import { PaymentsService } from './payments.service';

describe('Mock Bank idempotency', () => {
  let service: PaymentsService;
  beforeEach(() => {
    process.env.MOCK_BANK_SECRET = 'unit-test-secret';
    service = new PaymentsService();
  });
  afterEach(() => { delete process.env.MOCK_BANK_SECRET; });

  it('returns the exact same transaction for a repeated key', () => {
    const first = service.processPayment('order-1', 50000, 'test-key-0001', 'SUCCESS');
    const second = service.processPayment('order-1', 50000, 'test-key-0001', 'SUCCESS');
    expect(second).toEqual(first);
    expect(second.transactionId).toBe(first.transactionId);
  });

  it('rejects reuse of a key with a different payment payload', () => {
    service.processPayment('order-1', 50000, 'test-key-0002', 'SUCCESS');
    expect(() => service.processPayment('order-1', 60000, 'test-key-0002', 'SUCCESS')).toThrow(ConflictException);
  });
});
