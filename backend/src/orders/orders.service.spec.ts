
import { ConflictException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStateMachineService } from './services/order-state-machine.service';

describe('OrdersService inventory optimistic locking', () => {
  it('rejects an order when product version changed concurrently', async () => {
    const updateQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    };

    const manager = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        loyaltyPoints: 0,
      }),

      find: jest.fn()
        .mockResolvedValueOnce([
          {
            id: 'coffee-1',
            name: 'Ca phe sua',
            price: 30000,
            stock: 1,
            version: 2,
            isActive: true,
          },
        ])
        .mockResolvedValueOnce([
          {
            productId: 'coffee-1',
            size: 'M',
            price: 30000,
          },
        ]),

      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ points: '0' }),
      }),

      create: jest.fn((_entity, data) => data),
      save: jest.fn().mockImplementation((_entity, data) => data),
    };

    const dataSource = {
      transaction: jest.fn(
        (callback: (value: unknown) => unknown) => callback(manager),
      ),
    };

    const orderRepository = {};
    const inventoryService = {
      decreaseStock: jest.fn().mockRejectedValue(
        new ConflictException('Tồn kho đã thay đổi'),
      ),
    };
    const ingredientInventoryService = {
      reserveIngredients: jest.fn(),
    };
    const promotionsService = {
      assertUsable: jest.fn(),
      calculateDiscount: jest.fn(),
    };

    const service = new OrdersService(
      orderRepository as never,
      dataSource as never,
      inventoryService as never,
      ingredientInventoryService as never,
      promotionsService as never,
      new OrderStateMachineService(),
    );

    await expect(
      service.createOrder(
        {
          items: [
            {
              productId: 'coffee-1',
              size: 'M',
              qty: 1,
            },
          ],
        } as never,
        'user-1',
      ),
    ).rejects.toThrow(ConflictException);

    expect(inventoryService.decreaseStock).toHaveBeenCalled();
    expect(updateQueryBuilder.where).not.toHaveBeenCalled();
  });
});
