import { ConflictException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStateMachineService } from './services/order-state-machine.service';

describe('OrdersService inventory optimistic locking', () => {
  it('rejects an order when product version changed concurrently', async () => {
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    const manager = {
      find: jest.fn().mockResolvedValue([{ id: 'coffee-1', name: 'Cà phê sữa', price: 30000, stock: 1, version: 2 }]),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const dataSource = { transaction: jest.fn((callback: (value: unknown) => unknown) => callback(manager)) };
    const orderRepository = {};
    const promotionsService = { assertUsable: jest.fn(), calculateDiscount: jest.fn() };
    const service = new OrdersService(orderRepository as never, dataSource as never, promotionsService as never, new OrderStateMachineService());

    await expect(service.createOrder({ items: [{ productId: 'coffee-1', size: 'M', qty: 1 }] } as never, 'user-1'))
      .rejects.toThrow(ConflictException);
    expect(queryBuilder.where).toHaveBeenCalledWith(
      '"id" = :id AND "version" = :version AND "stock" >= :qty',
      { id: 'coffee-1', version: 2, qty: 1 },
    );
  });
});
