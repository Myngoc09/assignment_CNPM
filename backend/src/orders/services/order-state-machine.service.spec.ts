import { BadRequestException } from '@nestjs/common';
import { OrderStateMachineService } from './order-state-machine.service';
import { OrderStatus } from '../enums/order-status.enum';

describe('OrderStateMachineService', () => {
  let service: OrderStateMachineService;

  beforeEach(() => {
    service = new OrderStateMachineService();
  });

  it('cho phép luồng thành công', () => {
    expect(service.transition(OrderStatus.PENDING, OrderStatus.PAID))
      .toBe(OrderStatus.PAID);
    expect(service.transition(OrderStatus.PAID, OrderStatus.PREPARING))
      .toBe(OrderStatus.PREPARING);
    expect(service.transition(OrderStatus.PREPARING, OrderStatus.READY))
      .toBe(OrderStatus.READY);
    expect(service.transition(OrderStatus.READY, OrderStatus.COMPLETED))
      .toBe(OrderStatus.COMPLETED);
  });

  it('cho phép thử thanh toán lại', () => {
    expect(service.transition(OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED))
      .toBe(OrderStatus.PAYMENT_FAILED);
    expect(service.transition(OrderStatus.PAYMENT_FAILED, OrderStatus.PENDING))
      .toBe(OrderStatus.PENDING);
  });

  it('chặn nhảy cóc trạng thái', () => {
    expect(() =>
      service.transition(OrderStatus.PENDING, OrderStatus.COMPLETED),
    ).toThrow(BadRequestException);
  });

  it('chặn chuyển tiếp từ trạng thái kết thúc', () => {
    expect(() =>
      service.transition(OrderStatus.COMPLETED, OrderStatus.PENDING),
    ).toThrow(BadRequestException);

    expect(() =>
      service.transition(OrderStatus.CANCELLED, OrderStatus.PAID),
    ).toThrow(BadRequestException);
  });

  it('nhận diện trạng thái kết thúc', () => {
    expect(service.isTerminalState(OrderStatus.COMPLETED)).toBe(true);
    expect(service.isTerminalState(OrderStatus.CANCELLED)).toBe(true);
    expect(service.isTerminalState(OrderStatus.PENDING)).toBe(false);
  });
});