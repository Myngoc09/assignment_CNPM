
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';

export type SimulatedStatus = 'SUCCESS' | 'FAILED';

// Phiên thanh toán tương tác: Backend tạo, người dùng xác nhận trên trang Mock Bank.
export interface PaymentSession {
  id: string;
  orderId: string;
  amount: number;
  callbackUrl: string; // Backend nhận kết quả (server-to-server)
  returnUrl: string; // Trình duyệt được chuyển về sau khi xác nhận
  createdAt: number;
  finalStatus: SimulatedStatus | null;
}

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 phút

@Injectable()
export class PaymentsService {
  // Lưu trong bộ nhớ: đủ cho mục đích demo (restart Mock Bank thì phiên cũ mất).
  private readonly sessions = new Map<string, PaymentSession>();

  // =====================================================
  // Thanh toán tự động (giữ nguyên luồng cũ: POST /payments/charge)
  // =====================================================
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
    let status: SimulatedStatus;

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

  // =====================================================
  // Phiên thanh toán tương tác (có trang xác nhận)
  // =====================================================

  createSession(input: {
    orderId: string;
    amount: number;
    callbackUrl: string;
    returnUrl: string;
  }) {
    this.assertHttpUrl(input.callbackUrl, 'callbackUrl');
    this.assertHttpUrl(input.returnUrl, 'returnUrl');

    this.purgeExpiredSessions();

    const session: PaymentSession = {
      id: randomBytes(16).toString('hex'),
      orderId: input.orderId,
      amount: input.amount,
      callbackUrl: input.callbackUrl,
      returnUrl: input.returnUrl,
      createdAt: Date.now(),
      finalStatus: null,
    };

    this.sessions.set(session.id, session);

    return {
      sessionId: session.id,
      expiresAt: new Date(
        session.createdAt + SESSION_TTL_MS,
      ).toISOString(),
    };
  }

  getSession(sessionId: string): PaymentSession {
    const session = this.sessions.get(sessionId);

    if (
      !session ||
      Date.now() - session.createdAt > SESSION_TTL_MS
    ) {
      this.sessions.delete(sessionId);
      throw new NotFoundException(
        'Phiên thanh toán không tồn tại hoặc đã hết hạn',
      );
    }

    return session;
  }

  // Người dùng bấm "Thành công" / "Thất bại": ký kết quả rồi báo về Backend.
  // Trả về URL để chuyển trình duyệt về lại trang kết quả của cửa hàng.
  async completeSession(
    sessionId: string,
    result: SimulatedStatus,
  ): Promise<string> {
    const session = this.getSession(sessionId);

    // Đã xử lý rồi (bấm đúp / tải lại trang): không gửi lại.
    if (!session.finalStatus) {
      const payload = this.processPayment(
        session.orderId,
        session.amount,
        result,
      );

      let response: Response;
      try {
        response = await fetch(session.callbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.MOCK_BANK_API_KEY ?? '',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        });
      } catch {
        throw new BadGatewayException(
          'Không kết nối được tới Backend để báo kết quả',
        );
      }

      if (!response.ok) {
        throw new BadGatewayException(
          `Backend từ chối kết quả (HTTP ${response.status})`,
        );
      }

      session.finalStatus = result;
    }

    const url = new URL(session.returnUrl);
    url.searchParams.set(
      'status',
      session.finalStatus === 'SUCCESS' ? 'PAID' : 'PAYMENT_FAILED',
    );
    return url.toString();
  }

  private assertHttpUrl(value: unknown, field: string) {
    try {
      const url = new URL(String(value));
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return;
      }
    } catch {
      // rơi xuống throw bên dưới
    }
    throw new BadRequestException(`${field} không hợp lệ`);
  }

  private purgeExpiredSessions() {
    const now = Date.now();
    for (const [id, s] of this.sessions) {
      if (now - s.createdAt > SESSION_TTL_MS) {
        this.sessions.delete(id);
      }
    }
  }
}
