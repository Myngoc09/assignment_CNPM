
import { IsEnum, IsIn, IsUUID } from 'class-validator';

import {
  PaymentMethod,
  PaymentProvider,
} from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsUUID('all', {
    message: 'orderId không hợp lệ',
  })
  orderId: string;

  @IsEnum(PaymentMethod, {
    message: 'method phải là WALLET hoặc CARD',
  })
  method: PaymentMethod;

  @IsIn([PaymentProvider.MOCK, PaymentProvider.VNPAY], {
    message: 'provider phải là MOCK hoặc VNPAY',
  })
  provider: PaymentProvider.MOCK | PaymentProvider.VNPAY;
}
