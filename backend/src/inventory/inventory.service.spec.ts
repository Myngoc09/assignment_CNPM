
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let manager: any;
  let productRepository: any;

  const product = {
    id: '1',
    name: 'Ca phe sua',
    stock: 100,
    version: 1,
  };

  beforeEach(() => {
    service = new InventoryService();

    productRepository = {
      findBy: jest.fn().mockResolvedValue([{ ...product }]),
      findOne: jest.fn().mockResolvedValue({ ...product }),
    };

    manager = {
      getRepository: jest.fn().mockReturnValue(productRepository),
      query: jest.fn().mockResolvedValue([{ id: '1' }]),
    };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should decrease stock successfully', async () => {
    await service.decreaseStock(manager as EntityManager, [
      { productId: '1', quantity: 5 },
    ]);

    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "products"'),
      [5, '1', 1],
    );
  });

  it('should reject empty items', async () => {
    await expect(
      service.decreaseStock(manager as EntityManager, []),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject invalid quantity', async () => {
    await expect(
      service.decreaseStock(manager as EntityManager, [
        { productId: '1', quantity: 0 },
      ]),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject when product does not exist', async () => {
    productRepository.findBy.mockResolvedValue([]);

    await expect(
      service.decreaseStock(manager as EntityManager, [
        { productId: '999', quantity: 1 },
      ]),
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject when stock is insufficient', async () => {
    productRepository.findBy.mockResolvedValue([
      { ...product, stock: 2 },
    ]);

    await expect(
      service.decreaseStock(manager as EntityManager, [
        { productId: '1', quantity: 5 },
      ]),
    ).rejects.toThrow(BadRequestException);

    expect(manager.query).not.toHaveBeenCalled();
  });

  it('should aggregate duplicate products', async () => {
    await service.decreaseStock(manager as EntityManager, [
      { productId: '1', quantity: 2 },
      { productId: '1', quantity: 3 },
    ]);

    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE "products"'),
      [5, '1', 1],
    );
  });

  it('should reject when another transaction changes stock', async () => {
    manager.query.mockResolvedValue([]);

    productRepository.findOne.mockResolvedValue({
      ...product,
      stock: 90,
      version: 2,
    });

    await expect(
      service.decreaseStock(manager as EntityManager, [
        { productId: '1', quantity: 5 },
      ]),
    ).rejects.toThrow(ConflictException);
  });
});
