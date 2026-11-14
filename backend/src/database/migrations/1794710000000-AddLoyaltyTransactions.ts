
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoyaltyTransactions1794710000000
  implements MigrationInterface
{
  name = 'AddLoyaltyTransactions1794710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Them cac cot tich diem vao orders
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN "pointsRedeemed" integer NOT NULL DEFAULT 0,
      ADD COLUMN "pointsDiscountAmount" integer NOT NULL DEFAULT 0,
      ADD COLUMN "rewardPointsEarned" integer NOT NULL DEFAULT 0,
      ADD COLUMN "loyaltyAwardedAt" TIMESTAMP WITH TIME ZONE
    `);

    // Tao ENUM cho loai giao dich tich diem
    await queryRunner.query(`
      CREATE TYPE "public"."loyalty_transactions_type_enum"
      AS ENUM ('EARN', 'REDEEM')
    `);

    // Tao bang lich su giao dich tich diem
    await queryRunner.query(`
      CREATE TABLE "loyalty_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "orderId" uuid NOT NULL,
        "points" integer NOT NULL,
        "type" "public"."loyalty_transactions_type_enum" NOT NULL,
        "description" character varying(255) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loyalty_transactions"
          PRIMARY KEY ("id")
      )
    `);

    // Moi don hang chi co mot giao dich EARN va mot giao dich REDEEM
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_loyalty_order_type"
      ON "loyalty_transactions" ("orderId", "type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_loyalty_order_type"
    `);

    await queryRunner.query(`
      DROP TABLE "loyalty_transactions"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."loyalty_transactions_type_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP COLUMN "loyaltyAwardedAt",
      DROP COLUMN "rewardPointsEarned",
      DROP COLUMN "pointsDiscountAmount",
      DROP COLUMN "pointsRedeemed"
    `);
  }
}
