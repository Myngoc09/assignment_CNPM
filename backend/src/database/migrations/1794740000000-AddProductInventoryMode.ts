import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductInventoryMode1794740000000
  implements MigrationInterface
{
  name = 'AddProductInventoryMode1794740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "inventoryMode"
      character varying(20) NOT NULL DEFAULT 'INGREDIENT'
    `);

    // Croissant quản lý theo tồn kho thành phẩm.
    await queryRunner.query(`
      UPDATE "products"
      SET "inventoryMode" = 'FINISHED_GOOD'
      WHERE "id" = '3'
    `);

    // Butding quản lý theo nguyên liệu dù có size ONE_SIZE.
    await queryRunner.query(`
      UPDATE "products"
      SET "inventoryMode" = 'INGREDIENT'
      WHERE "id" = 'fa0f0985-864e-46b9-9d5a-f54acd19c3cd'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
      DROP COLUMN IF EXISTS "inventoryMode"
    `);
  }
}