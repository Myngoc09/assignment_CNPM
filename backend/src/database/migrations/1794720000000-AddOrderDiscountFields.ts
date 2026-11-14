
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderDiscountFields1794720000000
  implements MigrationInterface
{
  name = 'AddOrderDiscountFields1794720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "subtotal" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "discountAmount" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "promoCode" character varying(40)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "promoCode",
      DROP COLUMN IF EXISTS "discountAmount",
      DROP COLUMN IF EXISTS "subtotal"
    `);
  }
}
