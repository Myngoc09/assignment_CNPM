import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';

import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get('health')
  health() {
    return {
      service: 'BrewLite Mock Bank',
      status: 'UP',
      message: 'Mock Bank is running',
    };
  }

  @Post('payments/charge')
  @HttpCode(HttpStatus.OK)
  charge(
    @Headers('x-api-key') apiKey: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body()
    body: {
      orderId: string;
      amount: number;
      simulateResult?: string;
    },
  ) {
    const expectedApiKey = process.env.MOCK_BANK_API_KEY;

    if (!expectedApiKey || apiKey !== expectedApiKey) {
      throw new UnauthorizedException('Invalid API Key');
    }

    if (
      !body ||
      typeof body.orderId !== 'string' ||
      body.orderId.trim().length === 0
    ) {
      throw new BadRequestException('Invalid orderId');
    }

    if (
      !Number.isSafeInteger(body.amount) ||
      body.amount <= 0
    ) {
      throw new BadRequestException('Invalid amount');
    }

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
      idempotencyKey,
      body.simulateResult,
    );
  }
}