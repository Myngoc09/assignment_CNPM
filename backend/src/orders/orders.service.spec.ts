
import { ConflictException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStateMachineService } from './services/order-state-machine.service';

describe('OrdersService inventory optimistic locking', () => {
  it('rejects a ONE_SIZE order when product version changed concurrently', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        loyaltyPoints: 0,
      }),

      find: jest.fn()
        .mockResolvedValueOnce([
          {
            id: 'croissant-1',
            name: 'Banh Croissant',
            price: 30000,
            stock: 1,
            version: 2,
            isActive: true,
            inventoryMode: 'FINISHED_GOOD',
          },
        ])
        .mockResolvedValueOnce([
          {
            productId: 'croissant-1',
            size: 'ONE_SIZE',
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
              productId: 'croissant-1',
              size: 'ONE_SIZE',
              qty: 1,
            },
          ],
        } as never,
        'user-1',
      ),
    ).rejects.toThrow(ConflictException);

    expect(inventoryService.decreaseStock).toHaveBeenCalledWith(
      manager,
      [
        {
          productId: 'croissant-1',
          quantity: 1,
        },
      ],
    );

    // ONE_SIZE không giữ nguyên liệu.
    expect(
      ingredientInventoryService.reserveIngredients,
    ).not.toHaveBeenCalled();
  });
});
