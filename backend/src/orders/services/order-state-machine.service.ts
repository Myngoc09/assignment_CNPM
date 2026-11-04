import { Injectable, BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../enums/order-status.enum';

@Injectable()
export class OrderStateMachineService {
  /**
   * Định nghĩa các chuyển tiếp trạng thái hợp lệ dựa theo sơ đồ của BrewLite:
   * - PENDING -> PAID, PAYMENT_FAILED, CANCELLED
   * - PAYMENT_FAILED -> PENDING (thử lại), CANCELLED
   * - PAID -> PREPARING, CANCELLED
   * - PREPARING -> READY
   * - READY -> COMPLETED
   * - COMPLETED & CANCELLED: Trạng thái kết thúc (Terminal states), không thể chuyển tiếp.
   */
  private readonly validTransitions: Record<OrderStatus, OrderStatus[]> = {
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
    [OrderStatus.PREPARING]: [
      OrderStatus.READY,
    ],
    [OrderStatus.READY]: [
      OrderStatus.COMPLETED,
    ],
    [OrderStatus.COMPLETED]: [], // Trạng thái kết thúc
    [OrderStatus.CANCELLED]: [], // Trạng thái kết thúc
  };

  /**
   * Kiểm tra tính hợp lệ của việc chuyển trạng thái đơn hàng.
   * Chặn và ném lỗi BadRequestException nếu chuyển tiếp không có trong sơ đồ.
   */
  assertTransition(currentStatus: OrderStatus, nextStatus: OrderStatus): void {
    if (currentStatus === nextStatus) {
      throw new BadRequestException(
        `Đơn hàng đã ở trạng thái ${currentStatus}, không cần chuyển đổi.`,
      );
    }

    const allowedNextStatuses = this.validTransitions[currentStatus] || [];

    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new BadRequestException(
        `Chuyển trạng thái không hợp lệ: Không thể chuyển từ '${currentStatus}' sang '${nextStatus}'.`,
      );
    }
  }

  /**
   * Kiểm tra xem trạng thái có phải là trạng thái kết thúc (Terminal State) hay không.
   */
  isTerminalState(status: OrderStatus): boolean {
    return (
      status === OrderStatus.COMPLETED || status === OrderStatus.CANCELLED
    );
  }
}