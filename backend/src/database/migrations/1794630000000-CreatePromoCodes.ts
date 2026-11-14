
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePromoCodes1794630000000
  implements MigrationInterface
{
  name = 'CreatePromoCodes1794630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."promo_codes_type_enum"
      AS ENUM ('PERCENT', 'FIXED')
    `);

    await queryRunner.query(`
      CREATE TABLE "promo_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(40) NOT NULL,
        "type" "public"."promo_codes_type_enum" NOT NULL,
        "value" integer NOT NULL,
        "minOrderAmount" integer NOT NULL DEFAULT 0,
        "maxDiscountAmount" integer,
        "usageLimit" integer,
        "usedCount" integer NOT NULL DEFAULT 0,
        "startsAt" TIMESTAMP WITH TIME ZONE,
        "endsAt" TIMESTAMP WITH TIME ZONE,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_promo_codes_code" UNIQUE ("code"),
        CONSTRAINT "PK_promo_codes" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "promo_codes"`);
    await queryRunner.query(
      `DROP TYPE "public"."promo_codes_type_enum"`,
    );
  }
}
