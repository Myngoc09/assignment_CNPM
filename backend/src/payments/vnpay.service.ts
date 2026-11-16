import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import { DataSource } from 'typeorm';

import { Order, OrderStatus } from '../orders/entities/order.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  Payment,
  PaymentProvider,
  PaymentStatus,
} from './entities/payment.entity';
import {
  buildVnpayUrl,
  describeResponseCode,
  normalizeQuery,
  verifyVnpay,
  vnpayDate,
} from './vnpay.util';

const DEFAULT_SANDBOX_URL =
  'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

// VNPay chỉ nhận số tiền từ 5.000đ đến dưới 1 tỷ đồng.
const MIN_AMOUNT = 5_000;
const MAX_AMOUNT = 999_999_999;

// Giao dịch còn dưới ngần này thời gian thì không dùng lại (QR sắp hết hạn).
const REUSE_MARGIN_MS = 60_000;

interface VnpayConfig {
  tmnCode: string;
  secret: string;
  url: string;
  returnUrl: string;
  expireMinutes: number;
}

export interface VnpayCallbackOutcome {
  // Mã trả cho VNPay theo quy ước IPN: 00, 01, 02, 04, 97, 99.
  rspCode: string;
  message: string;
  payment?: Payment;
}

export interface VnpayCreateContext {
  ipAddr: string;
  idempotencyKey?: string;
}

@Injectable()
export class VnpayService {
  private readonly logger = new Logger(VnpayService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  // =====================================================
  // 1. TẠO GIAO DỊCH + MÃ QR
  // =====================================================

  async createPayment(
    dto: CreatePaymentDto,
    userId: string,
    ctx: VnpayCreateContext,
  ) {
    const cfg = this.getConfig();

    const payment = await this.dataSource.transaction(async (manager) => {
      // Khóa đơn hàng: các yêu cầu thanh toán cùng một đơn
      // được xử lý lần lượt, không tạo trùng giao dịch.
      const order = await manager.findOne(Order, {
        where: { id: dto.orderId, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException(
          'Không tìm thấy đơn hàng của tài khoản này',
        );
      }

      // (a) Idempotency-Key: gửi lại cùng key => trả lại giao dịch cũ.
      if (ctx.idempotencyKey) {
        const sameKey = await manager.findOne(Payment, {
          where: { userId, idempotencyKey: ctx.idempotencyKey },
        });

        if (sameKey) {
          if (
            sameKey.orderId !== order.id ||
            sameKey.provider !== PaymentProvider.VNPAY
          ) {
            throw new ConflictException(
              'Idempotency-Key đã được dùng cho một yêu cầu thanh toán khác',
            );
          }
          return sameKey;
        }
      }

      if (order.status === OrderStatus.PAID) {
        throw new ConflictException('Đơn hàng đã được thanh toán');
      }

      if (
        order.status !== OrderStatus.PENDING &&
        order.status !== OrderStatus.PAYMENT_FAILED
      ) {
        throw new ConflictException(
          'Đơn hàng không thể thanh toán ở trạng thái hiện tại',
        );
      }

      if (!Number.isSafeInteger(order.total)) {
        throw new BadRequestException('Tổng tiền đơn hàng không hợp lệ');
      }
      if (order.total < MIN_AMOUNT || order.total > MAX_AMOUNT) {
        throw new BadRequestException(
          'VNPay chỉ hỗ trợ số tiền từ 5.000đ đến dưới 1.000.000.000đ',
        );
      }

      // (b) Đơn đang có giao dịch VNPay chờ thanh toán còn hạn => dùng lại.
      const pending = await manager.findOne(Payment, {
        where: {
          orderId: order.id,
          userId,
          provider: PaymentProvider.VNPAY,
          status: PaymentStatus.PENDING,
        },
        order: { createdAt: 'DESC' },
      });

      if (
        pending &&
        this.expiresAt(pending, cfg.expireMinutes).getTime() - Date.now() >
          REUSE_MARGIN_MS
      ) {
        return pending;
      }

      // (c) Thử lại sau khi lỗi: PAYMENT_FAILED -> PENDING
      // (đúng sơ đồ máy trạng thái đơn hàng ở Task 10).
      if (order.status === OrderStatus.PAYMENT_FAILED) {
        order.status = OrderStatus.PENDING;
        await manager.save(Order, order);
      }

      // (d) Tạo giao dịch mới. txnRef chỉ gồm chữ + số cho an toàn với VNPay.
      const now = new Date();
      const txnRef = `${now.getTime()}${randomBytes(4).toString('hex')}`;

      const paymentUrl = buildVnpayUrl(cfg.url, cfg.secret, {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: cfg.tmnCode,
        vnp_Amount: order.total * 100, // VNPay yêu cầu nhân 100
        vnp_CurrCode: 'VND',
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: `Thanh toan don hang ${order.id.replace(/-/g, '')}`, // không dấu
        vnp_OrderType: 'other',
        vnp_Locale: 'vn',
        vnp_ReturnUrl: cfg.returnUrl,
        vnp_IpAddr: ctx.ipAddr,
        vnp_CreateDate: vnpayDate(now),
        vnp_ExpireDate: vnpayDate(
          new Date(now.getTime() + cfg.expireMinutes * 60_000),
        ),
      });

      return manager.save(
        Payment,
        manager.create(Payment, {
          orderId: order.id,
          userId,
          amount: order.total,
          method: dto.method,
          provider: PaymentProvider.VNPAY,
          status: PaymentStatus.PENDING,
          txnRef,
          idempotencyKey: ctx.idempotencyKey ?? null,
          mockTransactionId: null,
          vnpTransactionNo: null,
          responseCode: null,
          paymentUrl,
        }),
      );
    });

    return {
      message:
        payment.status === PaymentStatus.PENDING
          ? 'Quét mã QR hoặc mở paymentUrl để thanh toán qua VNPay'
          : 'Giao dịch đã có kết quả',
      ...(await this.toView(payment)),
    };
  }

  // =====================================================
  // 2. XỬ LÝ KẾT QUẢ TỪ VNPAY (IPN + RETURN URL)
  // =====================================================

  /**
   * Dùng chung cho cả IPN (server-to-server) và Return URL (trình duyệt).
   * Idempotent: gọi nhiều lần với cùng một giao dịch chỉ cập nhật một lần.
   *
   * TASK 10 HOOK: đây là điểm DUY NHẤT chuyển đơn PENDING -> PAID/PAYMENT_FAILED
   * của luồng VNPay. Khi làm Task 10, thêm vào trong transaction bên dưới:
   *   - assertTransition(order.status, OrderStatus.PAID)
   *   - trừ tồn kho (optimistic locking) nếu chọn trừ khi thanh toán thành công
   *   - cộng điểm thưởng (loyalty) cho user sau khi PAID
   */
  async processCallback(rawQuery: unknown): Promise<VnpayCallbackOutcome> {
    const query = normalizeQuery(rawQuery);
    const secret = this.configService.get<string>('VNPAY_HASH_SECRET');

    if (!secret || !verifyVnpay(query, secret)) {
      return { rspCode: '97', message: 'Invalid signature' };
    }

    const txnRef = query.vnp_TxnRef;
    if (!txnRef) {
      return { rspCode: '01', message: 'Order not found' };
    }

    return this.dataSource.transaction(
      async (manager): Promise<VnpayCallbackOutcome> => {
        const payment = await manager.findOne(Payment, {
          where: { txnRef, provider: PaymentProvider.VNPAY },
          lock: { mode: 'pessimistic_write' },
        });

        if (!payment) {
          return { rspCode: '01', message: 'Order not found' };
        }

        if (Number(query.vnp_Amount) !== payment.amount * 100) {
          return { rspCode: '04', message: 'Invalid amount', payment };
        }

        // Đã xử lý rồi (IPN và Return URL có thể cùng tới): không làm lại.
        if (payment.status !== PaymentStatus.PENDING) {
          return {
            rspCode: '02',
            message: 'Order already confirmed',
            payment,
          };
        }

        const order = await manager.findOne(Order, {
          where: { id: payment.orderId },
          lock: { mode: 'pessimistic_write' },
        });

        const success =
          query.vnp_ResponseCode === '00' &&
          query.vnp_TransactionStatus === '00';

        payment.status = success
          ? PaymentStatus.PAID
          : PaymentStatus.PAYMENT_FAILED;
        payment.vnpTransactionNo = query.vnp_TransactionNo ?? null;
        payment.responseCode = query.vnp_ResponseCode ?? null;
        await manager.save(Payment, payment);

        if (order) {
          if (order.status === OrderStatus.PENDING) {
            order.status = success
              ? OrderStatus.PAID
              : OrderStatus.PAYMENT_FAILED;
            await manager.save(Order, order);
          } else if (success) {
            // Tiền đã vào nhưng đơn không còn ở PENDING
            // (đã PAID bằng giao dịch khác, hoặc đã bị hủy): cần đối soát.
            this.logger.warn(
              `Giao dịch VNPay ${payment.id} thành công nhưng đơn ` +
                `${order.id} đang ở trạng thái ${order.status}. Cần đối soát/hoàn tiền.`,
            );
          }
        }

        return { rspCode: '00', message: 'Confirm Success', payment };
      },
    );
  }

  /** Phản hồi cho IPN: VNPay chỉ đọc RspCode/Message. */
  async handleIpn(rawQuery: unknown) {
    try {
      const outcome = await this.processCallback(rawQuery);
      return { RspCode: outcome.rspCode, Message: outcome.message };
    } catch (error) {
      this.logger.error(
        'Xử lý IPN VNPay lỗi',
        error instanceof Error ? error.stack : String(error),
      );
      return { RspCode: '99', Message: 'Unknown error' };
    }
  }

  /** Phản hồi cho Return URL: kết quả hiển thị cho người dùng. */
  async handleReturn(rawQuery: unknown) {
    const outcome = await this.processCallback(rawQuery);
    const payment = outcome.payment;
    const rejected = ['97', '01', '04'].includes(outcome.rspCode);

    const status = rejected || !payment ? 'INVALID' : payment.status;
    const responseCode = normalizeQuery(rawQuery).vnp_ResponseCode;

    const body = {
      success: status === PaymentStatus.PAID,
      status,
      orderId: payment?.orderId ?? null,
      paymentId: payment?.id ?? null,
      responseCode: responseCode ?? null,
      message:
        outcome.rspCode === '97'
          ? 'Chữ ký không hợp lệ'
          : rejected
            ? 'Dữ liệu giao dịch không hợp lệ'
            : status === PaymentStatus.PAID
              ? 'Thanh toán thành công'
              : describeResponseCode(responseCode),
    };

    return { body, redirectUrl: this.buildResultRedirect(body) };
  }

  // =====================================================
  // 3. DỮ LIỆU TRẢ VỀ CHO CLIENT (CÓ MÃ QR)
  // =====================================================

  async toView(payment: Payment) {
    const expiresAt = this.expiresAt(payment, this.expireMinutes());
    const awaiting =
      payment.status === PaymentStatus.PENDING &&
      expiresAt.getTime() > Date.now() &&
      !!payment.paymentUrl;

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      method: payment.method,
      provider: payment.provider,
      status: payment.status,
      transactionRef: payment.txnRef,
      vnpTransactionNo: payment.vnpTransactionNo,
      responseCode: payment.responseCode,
      simulated: false,
      expiresAt: expiresAt.toISOString(),
      // Chỉ trả URL/QR khi còn chờ thanh toán và chưa hết hạn.
      ...(awaiting
        ? {
            paymentUrl: payment.paymentUrl,
            qrCode: await this.generateQr(payment.paymentUrl as string),
          }
        : {}),
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  /** Mã QR dạng data URL (PNG base64): đặt thẳng vào <img src="..."/>. */
  generateQr(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
      type: 'image/png',
      errorCorrectionLevel: 'L', // URL dài: mức L giữ QR thưa, dễ quét
      margin: 2,
      width: 600,
    });
  }

  // =====================================================
  // 4. HÀM PHỤ
  // =====================================================

  private expireMinutes(): number {
    const value = Number(
      this.configService.get<string>('VNPAY_EXPIRE_MINUTES', '15'),
    );
    return Number.isFinite(value) && value >= 1 && value <= 1440 ? value : 15;
  }

  private expiresAt(payment: Payment, minutes: number): Date {
    return new Date(payment.createdAt.getTime() + minutes * 60_000);
  }

  private getConfig(): VnpayConfig {
    const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE');
    const secret = this.configService.get<string>('VNPAY_HASH_SECRET');
    const returnUrl = this.configService.get<string>('VNPAY_RETURN_URL');

    // Tên biến chính là VNPAY_PAYMENT_URL; vẫn nhận VNPAY_URL (tên cũ).
    // Không khai báo thì dùng URL sandbox mặc định.
    const url =
      this.configService.get<string>('VNPAY_PAYMENT_URL') ||
      this.configService.get<string>('VNPAY_URL') ||
      DEFAULT_SANDBOX_URL;

    if (!tmnCode || !secret || !returnUrl) {
      throw new InternalServerErrorException(
        'Chưa cấu hình VNPay (cần VNPAY_TMN_CODE, VNPAY_HASH_SECRET, VNPAY_RETURN_URL)',
      );
    }

    return {
      tmnCode,
      secret,
      url,
      returnUrl,
      expireMinutes: this.expireMinutes(),
    };
  }

  // Nếu có VNPAY_RESULT_REDIRECT_URL (trang xác nhận ở frontend, Task 9)
  // thì chuyển hướng trình duyệt tới đó; nếu không, trả JSON.
  private buildResultRedirect(body: {
    status: string;
    orderId: string | null;
    paymentId: string | null;
  }): string | null {
    const target = this.configService.get<string>(
      'VNPAY_RESULT_REDIRECT_URL',
    );
    if (!target) return null;

    try {
      const url = new URL(target);
      url.searchParams.set('status', body.status);
      if (body.orderId) url.searchParams.set('orderId', body.orderId);
      if (body.paymentId) url.searchParams.set('paymentId', body.paymentId);
      return url.toString();
    } catch {
      this.logger.warn('VNPAY_RESULT_REDIRECT_URL không phải URL hợp lệ');
      return null;
    }
  }
}
