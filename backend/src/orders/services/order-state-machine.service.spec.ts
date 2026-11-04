import { BadRequestException } from '@nestjs/common';
import { OrderStateMachineService } from './order-state-machine.service';
import { OrderStatus } from '../enums/order-status.enum';

describe('OrderStateMachineService', () => {
  let service: OrderStateMachineService;

  beforeEach(() => {
    service = new OrderStateMachineService();
  });

  describe('Happy Path & Valid Transitions (Các chuyển tiếp hợp lệ)', () => {
    it('1. Luồng xanh thành công: PENDING -> PAID -> PREPARING -> READY -> COMPLETED', () => {
      expect(() => service.assertTransition(OrderStatus.PENDING, OrderStatus.PAID)).not.toThrow();
      expect(() => service.assertTransition(OrderStatus.PAID, OrderStatus.PREPARING)).not.toThrow();
      expect(() => service.assertTransition(OrderStatus.PREPARING, OrderStatus.READY)).not.toThrow();
      expect(() => service.assertTransition(OrderStatus.READY, OrderStatus.COMPLETED)).not.toThrow();
    });

    it('2. Luồng thanh toán lỗi và thử lại: PENDING -> PAYMENT_FAILED -> PENDING', () => {
      expect(() => service.assertTransition(OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED)).not.toThrow();
      expect(() => service.assertTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.PENDING)).not.toThrow();
    });

    it('3. Luồng hủy đơn từ PENDING, PAID, hoặc PAYMENT_FAILED', () => {
      expect(() => service.assertTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)).not.toThrow();
      expect(() => service.assertTransition(OrderStatus.PAID, OrderStatus.CANCELLED)).not.toThrow();
      expect(() => service.assertTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED)).not.toThrow();
    });
  });

  describe('Invalid Transitions (Các chuyển tiếp bị CHẶN & NÉM LỖI)', () => {
    it('1. Chặn nhảy cóc trạng thái từ PENDING', () => {
      expect(() => service.assertTransition(OrderStatus.PENDING, OrderStatus.PREPARING)).toThrow(BadRequestException);
      expect(() => service.assertTransition(OrderStatus.PENDING, OrderStatus.READY)).toThrow(BadRequestException);
      expect(() => service.assertTransition(OrderStatus.PENDING, OrderStatus.COMPLETED)).toThrow(BadRequestException);
    });

    it('2. Chặn chuyển từ trạng thái kết thúc COMPLETED', () => {
      expect(() => service.assertTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED)).toThrow(BadRequestException);
      expect(() => service.assertTransition(OrderStatus.COMPLETED, OrderStatus.PAID)).toThrow(BadRequestException);
      expect(() => service.assertTransition(OrderStatus.COMPLETED, OrderStatus.PENDING)).toThrow(BadRequestException);
    });

    it('3. Chặn chuyển từ trạng thái kết thúc CANCELLED', () => {
      expect(() => service.assertTransition(OrderStatus.CANCELLED, OrderStatus.PENDING)).toThrow(BadRequestException);
      expect(() => service.assertTransition(OrderStatus.CANCELLED, OrderStatus.PAID)).toThrow(BadRequestException);
      expect(() => service.assertTransition(OrderStatus.CANCELLED, OrderStatus.COMPLETED)).toThrow(BadRequestException);
    });

    it('4. Chặn đi ngược quy trình (Ví dụ: READY -> PREPARING, COMPLETED -> READY)', () => {
      expect(() => service.assertTransition(OrderStatus.READY, OrderStatus.PREPARING)).toThrow(BadRequestException);
      expect(() => service.assertTransition(OrderStatus.PREPARING, OrderStatus.PAID)).toThrow(BadRequestException);
      expect(() => service.assertTransition(OrderStatus.PAID, OrderStatus.PENDING)).toThrow(BadRequestException);
    });

    it('5. Chặn hủy đơn khi đã ở trạng thái PREPARING hoặc READY (chỉ cho phép khi ở PENDING/PAID/PAYMENT_FAILED)', () => {
      expect(() => service.assertTransition(OrderStatus.PREPARING, OrderStatus.CANCELLED)).toThrow(BadRequestException);
      expect(() => service.assertTransition(OrderStatus.READY, OrderStatus.CANCELLED)).toThrow(BadRequestException);
    });

    it('6. Chặn chuyển sang chính trạng thái hiện tại', () => {
      expect(() => service.assertTransition(OrderStatus.PENDING, OrderStatus.PENDING)).toThrow(BadRequestException);
      expect(() => service.assertTransition(OrderStatus.PAID, OrderStatus.PAID)).toThrow(BadRequestException);
    });
  });

  describe('isTerminalState Helper Method', () => {
    it('Xác định chính xác trạng thái kết thúc', () => {
      expect(service.isTerminalState(OrderStatus.COMPLETED)).toBe(true);
      expect(service.isTerminalState(OrderStatus.CANCELLED)).toBe(true);
      expect(service.isTerminalState(OrderStatus.PENDING)).toBe(false);
      expect(service.isTerminalState(OrderStatus.PAID)).toBe(false);
    });
  });
});