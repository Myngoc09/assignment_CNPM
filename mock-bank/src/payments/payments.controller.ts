import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Redirect,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { renderNotFoundPage, renderPayPage } from './pay-page';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  private assertApiKey(apiKey: string | undefined) {
    const expectedApiKey = process.env.MOCK_BANK_API_KEY;

    console.log('========== MOCK BANK AUTH ==========');
    console.log('API Key received:', apiKey ? 'CÓ' : 'KHÔNG');
    console.log('Expected API Key configured:', expectedApiKey ? 'CÓ' : 'KHÔNG');
    console.log('API Key matches:', apiKey === expectedApiKey);
    console.log('====================================');

    if (!expectedApiKey || apiKey !== expectedApiKey) {
      throw new UnauthorizedException('Invalid API Key');
    }
  }

  private assertOrderAndAmount(body: {
    orderId?: unknown;
    amount?: unknown;
  }) {
    if (
      !body ||
      typeof body.orderId !== 'string' ||
      body.orderId.trim().length === 0
    ) {
      throw new BadRequestException('Invalid orderId');
    }

    if (
      typeof body.amount !== 'number' ||
      !Number.isSafeInteger(body.amount) ||
      body.amount <= 0
    ) {
      throw new BadRequestException('Invalid amount');
    }
  }

  @Get('health')
  health() {
    return {
      service: 'BrewLite Mock Bank',
      status: 'UP',
      message: 'Mock Bank is running',
    };
  }

  // Thanh toán tự động, có kết quả ngay (không có trang xác nhận).
  @Post('payments/charge')
  @HttpCode(HttpStatus.OK)
  charge(
    @Headers('x-api-key') apiKey: string,
    @Body()
    body: {
      orderId: string;
      amount: number;
      simulateResult?: string;
    },
  ) {
    this.assertApiKey(apiKey);
    this.assertOrderAndAmount(body);

    if (
      body.simulateResult !== undefined &&
      !['SUCCESS', 'FAILED'].includes(body.simulateResult)
    ) {
      throw new BadRequestException(
        'simulateResult must be SUCCESS or FAILED',
      );
    }

    return this.paymentsService.processPayment(
      body.orderId,
      body.amount,
      body.simulateResult,
    );
  }

  // Backend tạo phiên thanh toán tương tác (server-to-server, cần API Key).
  @Post('payments/sessions')
  @HttpCode(HttpStatus.CREATED)
  createSession(
    @Headers('x-api-key') apiKey: string,
    @Body()
    body: {
      orderId: string;
      amount: number;
      callbackUrl: string;
      returnUrl: string;
    },
  ) {
    this.assertApiKey(apiKey);
    this.assertOrderAndAmount(body);

    return this.paymentsService.createSession({
      orderId: body.orderId,
      amount: body.amount,
      callbackUrl: body.callbackUrl,
      returnUrl: body.returnUrl,
    });
  }

  // Trang người dùng nhìn thấy: hiện số tiền + 2 nút xác nhận.
  @Get('pay/:sessionId')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  payPage(
    @Param('sessionId') sessionId: string,
    @Query('error') error?: string,
  ) {
    try {
      const session = this.paymentsService.getSession(sessionId);

      return renderPayPage({
        sessionId: session.id,
        orderId: session.orderId,
        amount: session.amount,
        error: error ? 'Không gửi được kết quả về cửa hàng. Vui lòng thử lại.' : undefined,
      });
    } catch (e) {
      if (e instanceof NotFoundException) {
        return renderNotFoundPage(e.message);
      }
      throw e;
    }
  }

  // Người dùng bấm nút: gửi kết quả về Backend rồi chuyển về trang kết quả.
  @Post('pay/:sessionId/confirm')
  @Redirect()
  async confirm(
    @Param('sessionId') sessionId: string,
    @Body('result') result: string,
  ) {
    if (result !== 'SUCCESS' && result !== 'FAILED') {
      throw new BadRequestException(
        'result must be SUCCESS or FAILED',
      );
    }

    try {
      const url = await this.paymentsService.completeSession(
        sessionId,
        result,
      );
      return { url, statusCode: 303 };
    } catch (e) {
      if (e instanceof NotFoundException) {
        throw e;
      }
      // Backend không nhận được kết quả: quay lại trang thanh toán, báo lỗi.
      return {
        url: `/pay/${encodeURIComponent(sessionId)}?error=callback`,
        statusCode: 303,
      };
    }
  }
}
