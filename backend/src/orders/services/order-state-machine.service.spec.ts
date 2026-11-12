import { BadRequestException } from '@nestjs/common';
import { OrderStateMachineService } from './order-state-machine.service';
import { OrderStatus } from '../entities/order.entity';

describe('OrderStateMachineService', () => {
  let service: OrderStateMachineService;
  beforeEach(() => { service = new OrderStateMachineService(); });
  it('allows the successful order lifecycle', () => {
    expect(service.transition(OrderStatus.PENDING, OrderStatus.PAID)).toBe(OrderStatus.PAID);
    expect(service.transition(OrderStatus.PAID, OrderStatus.PREPARING)).toBe(OrderStatus.PREPARING);
    expect(service.transition(OrderStatus.PREPARING, OrderStatus.READY)).toBe(OrderStatus.READY);
    expect(service.transition(OrderStatus.READY, OrderStatus.COMPLETED)).toBe(OrderStatus.COMPLETED);
  });
  it('allows retry after a failed payment', () => {
    expect(service.transition(OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED)).toBe(OrderStatus.PAYMENT_FAILED);
    expect(service.transition(OrderStatus.PAYMENT_FAILED, OrderStatus.PENDING)).toBe(OrderStatus.PENDING);
  });
  it('rejects skipping states and transitions from terminal states', () => {
    expect(() => service.transition(OrderStatus.PENDING, OrderStatus.COMPLETED)).toThrow(BadRequestException);
    expect(() => service.transition(OrderStatus.COMPLETED, OrderStatus.PENDING)).toThrow(BadRequestException);
    expect(() => service.transition(OrderStatus.CANCELLED, OrderStatus.PAID)).toThrow(BadRequestException);
  });
});
