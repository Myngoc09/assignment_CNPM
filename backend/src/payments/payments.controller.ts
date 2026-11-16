
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';
import { VnpayService } from './vnpay.service';
import { getClientIp } from './vnpay.util';

// Payload Mock Bank gửi về (được xác minh kỹ trong PaymentsService).
interface MockBankCallbackBody {
  orderId: string;
  transactionId: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED';
  processedAt: string;
  signature: string;
}

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    email: string;
  };
};

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly vnpayService: VnpayService,
  ) {}

  // Tạo giao dịch: bắt buộc đăng nhập.
  // - provider MOCK: thanh toán ngay, trả kết quả PAID / PAYMENT_FAILED.
  // - provider VNPAY: trả PENDING + paymentUrl + qrCode (data URL PNG).
  // Header tùy chọn: Idempotency-Key (gửi lại cùng key => cùng một giao dịch).
  @Post()
  @UseGuards(JwtAuthGuard)
  createPayment(
    @Body() dto: CreatePaymentDto,
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.createPayment(
      dto,
      req.user.userId,
      {
        ipAddr: getClientIp(req),
        idempotencyKey,
      },
    );
  }

  // IPN: VNPay gọi server-to-server. KHÔNG dùng JwtAuthGuard,
  // tính xác thực dựa vào chữ ký HMAC-SHA512 (vnp_SecureHash).
  @Get('vnpay/ipn')
  vnpayIpn(@Query() query: Record<string, string>) {
    return this.vnpayService.handleIpn(query);
  }

  // Return URL: trình duyệt người thanh toán được VNPay chuyển về đây.
  // Cũng xác thực chữ ký rồi cập nhật giao dịch (idempotent với IPN).
  @Get('vnpay/return')
  async vnpayReturn(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    const { body, redirectUrl } =
      await this.vnpayService.handleReturn(query);

    if (redirectUrl) {
      return res.redirect(redirectUrl);
    }
    return res.status(200).json(body);
  }

  // Mock Bank gọi server-to-server sau khi người dùng bấm nút trên trang Mock Bank.
  // KHÔNG dùng JwtAuthGuard: xác thực bằng x-api-key + chữ ký HMAC trong body.
  @Post('mock/callback/:paymentId')
  @HttpCode(200)
  mockCallback(
    @Param('paymentId') paymentId: string,
    @Headers('x-api-key') apiKey: string | undefined,
    @Body() body: MockBankCallbackBody,
  ) {
    return this.paymentsService.handleMockCallback(
      paymentId,
      apiKey,
      body,
    );
  }

  // Xem giao dịch: chỉ chủ sở hữu mới được xem.
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getPayment(
    @Param('id') paymentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.getPayment(
      paymentId,
      req.user.userId,
    );
  }
}
