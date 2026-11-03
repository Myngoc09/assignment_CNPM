
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

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
  ) {}

  // Tạo giao dịch: bắt buộc đăng nhập.
  @Post()
  @UseGuards(JwtAuthGuard)
  createPayment(
    @Body() dto: CreatePaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.createPayment(
      dto,
      req.user.userId,
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
