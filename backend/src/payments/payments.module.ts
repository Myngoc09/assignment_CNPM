
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { Order } from '../orders/entities/order.entity';
import { Payment } from './entities/payment.entity';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { OrdersModule } from '../orders/orders.module';
import { User } from '../users/entities/user.entity';
import { LoyaltyTransaction } from '../loyalty/entities/loyalty-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order, User, LoyaltyTransaction]),
    OrdersModule,
    AuthModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
