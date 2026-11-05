import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus } from '../enums/order-status.enum';

@Injectable()
export class OrderStateMachineService {
  private readonly transitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [
      OrderStatus.PAID,
      OrderStatus.PAYMENT_FAILED,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.PAYMENT_FAILED]: [
      OrderStatus.PENDING,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.PAID]: [
      OrderStatus.PREPARING,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.PREPARING]: [OrderStatus.READY],
    [OrderStatus.READY]: [OrderStatus.COMPLETED],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.CANCELLED]: [],
  };

  transition(current: OrderStatus, next: OrderStatus): OrderStatus {
    if (!Object.values(OrderStatus).includes(current)) {
      throw new BadRequestException(`Trạng thái hiện tại không hợp lệ: ${current}`);
    }

    if (!Object.values(OrderStatus).includes(next)) {
      throw new BadRequestException(`Trạng thái tiếp theo không hợp lệ: ${next}`);
    }

    if (!this.transitions[current].includes(next)) {
      throw new BadRequestException(
        `Không thể chuyển đơn hàng từ '${current}' sang '${next}'.`,
      );
    }

    return next;
  }

  isTerminalState(status: OrderStatus): boolean {
    return (
      status === OrderStatus.COMPLETED ||
      status === OrderStatus.CANCELLED
    );
  }
}