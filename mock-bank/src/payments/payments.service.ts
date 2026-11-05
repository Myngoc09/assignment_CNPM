
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';

@Injectable()
export class PaymentsService {
  processPayment(
    orderId: string,
    amount: number,
    simulateResult?: string,
  ) {
    const secret = process.env.MOCK_BANK_SECRET;

    if (!secret) {
      throw new InternalServerErrorException(
        'MOCK_BANK_SECRET is not configured',
      );
    }

    // Mô phỏng kết quả giao dịch
    let status: 'SUCCESS' | 'FAILED';

    if (simulateResult === 'FAILED') {
      status = 'FAILED';
    } else {
      status = 'SUCCESS';
    }

    // Tạo mã giao dịch
    const transactionId = randomUUID();

    // Thời gian xử lý
    const processedAt = new Date().toISOString();

    // Dữ liệu kết quả giao dịch
    const paymentData = {
      orderId,
      transactionId,
      amount,
      status,
      processedAt,
    };

    // Tạo chữ ký HMAC SHA256
    const signature = createHmac('sha256', secret)
      .update(JSON.stringify(paymentData))
      .digest('hex');

    return {
      ...paymentData,
      signature,
    };
  }
}
