
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

  @IsIn([PaymentProvider.MOCK], {
    message: 'Hiện tại chỉ hỗ trợ thanh toán qua MOCK BANK',
  })
  provider: PaymentProvider.MOCK;
}
