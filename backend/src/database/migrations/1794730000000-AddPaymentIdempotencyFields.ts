
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentIdempotencyFields1794730000000
  implements MigrationInterface
{
  name = 'AddPaymentIdempotencyFields1794730000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD COLUMN IF NOT EXISTS "idempotencyKey" character varying(128),
      ADD COLUMN IF NOT EXISTS "requestHash" character varying(64)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_payments_user_idempotency"
      ON "payments" ("userId", "idempotencyKey")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_payments_user_idempotency"
    `);

    await queryRunner.query(`
      ALTER TABLE "payments"
      DROP COLUMN IF EXISTS "requestHash",
      DROP COLUMN IF EXISTS "idempotencyKey"
    `);
  }
}
