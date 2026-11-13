
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductManagement1794500000000
  implements MigrationInterface
{
  name = 'AddProductManagement1794500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Trang thai ban san pham
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD COLUMN "isActive" boolean NOT NULL DEFAULT true
    `);

    // Bang gia rieng cho tung size
    await queryRunner.query(`
      CREATE TABLE "product_size_prices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "productId" character varying NOT NULL,
        "size" character varying NOT NULL,
        "price" double precision NOT NULL,
        CONSTRAINT "PK_product_size_prices"
          PRIMARY KEY ("id"),
        CONSTRAINT "UQ_product_size_prices_product_size"
          UNIQUE ("productId", "size"),
        CONSTRAINT "FK_product_size_prices_product"
          FOREIGN KEY ("productId")
          REFERENCES "products"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION
      )
    `);

    // Chuyen gia hien tai sang bang gia moi.
    // San pham 3 la Croissant, chi co ONE_SIZE.
    // Cac san pham con lai co S, M, L.
    await queryRunner.query(`
      INSERT INTO "product_size_prices"
        ("productId", "size", "price")
      SELECT
        p."id",
        sizes."size",
        p."price" + sizes."extra"
      FROM "products" p
      CROSS JOIN (
        VALUES
          ('S', 0::double precision),
          ('M', 5000::double precision),
          ('L', 10000::double precision),
          ('ONE_SIZE', 0::double precision)
      ) AS sizes("size", "extra")
      WHERE
        (p."id" = '3' AND sizes."size" = 'ONE_SIZE')
        OR
        (p."id" <> '3' AND sizes."size" IN ('S', 'M', 'L'))
      ON CONFLICT ("productId", "size") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "product_size_prices"
    `);

    await queryRunner.query(`
      ALTER TABLE "products"
      DROP COLUMN "isActive"
    `);
  }
}
