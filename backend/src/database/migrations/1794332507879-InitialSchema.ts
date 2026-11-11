import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1794332507879 implements MigrationInterface {
    name = 'InitialSchema1794332507879';


    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "fullName" text, "phone" text, "gender" text, "birthDate" text, "address" text, "resetPasswordToken" text, "resetPasswordExpires" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "products" ("id" character varying NOT NULL, "version" integer NOT NULL, "name" character varying NOT NULL, "category" character varying NOT NULL, "rating" double precision NOT NULL, "price" double precision NOT NULL, "imageUrl" character varying, "stock" integer NOT NULL DEFAULT '100', CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "productId" character varying NOT NULL, "size" character varying NOT NULL, "qty" integer NOT NULL, "productName" character varying, "unitPrice" double precision, "lineTotal" double precision NOT NULL, "toppings" text, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'PAYMENT_FAILED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying, "status" "public"."orders_status_enum" NOT NULL DEFAULT 'PENDING', "total" double precision NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payments_method_enum" AS ENUM('WALLET', 'CARD')`);
        await queryRunner.query(`CREATE TYPE "public"."payments_provider_enum" AS ENUM('MOCK', 'VNPAY')`);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('PENDING', 'PAID', 'PAYMENT_FAILED')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "userId" uuid NOT NULL, "amount" integer NOT NULL, "method" "public"."payments_method_enum" NOT NULL, "provider" "public"."payments_provider_enum" NOT NULL DEFAULT 'MOCK', "status" "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING', "txnRef" character varying NOT NULL, "mockTransactionId" character varying, "vnpTransactionNo" character varying, "responseCode" character varying, "paymentUrl" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_dbcae6dc928abd4209411e2048b" UNIQUE ("txnRef"), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ingredients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "unit" character varying NOT NULL, "stock" double precision NOT NULL DEFAULT '0', "reservedStock" double precision NOT NULL DEFAULT '0', "version" integer NOT NULL, CONSTRAINT "UQ_a955029b22ff66ae9fef2e161f8" UNIQUE ("name"), CONSTRAINT "PK_9240185c8a5507251c9f15e0649" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "product_recipes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "productId" character varying NOT NULL, "ingredientId" uuid NOT NULL, "size" character varying NOT NULL DEFAULT 'M', "quantity" double precision NOT NULL, CONSTRAINT "UQ_6dafac320cbc9ed2585f9524835" UNIQUE ("productId", "ingredientId", "size"), CONSTRAINT "PK_eefb5f327f5fd58db7304eea7db" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."order_ingredients_status_enum" AS ENUM('RESERVED', 'CONSUMED', 'RELEASED')`);
        await queryRunner.query(`CREATE TABLE "order_ingredients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "ingredientId" uuid NOT NULL, "quantity" double precision NOT NULL, "status" "public"."order_ingredients_status_enum" NOT NULL DEFAULT 'RESERVED', CONSTRAINT "UQ_409a52c352b0427b6a286f1b796" UNIQUE ("orderId", "ingredientId"), CONSTRAINT "PK_971fef27e9256e0575393b6a442" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."inventory_transactions_type_enum" AS ENUM('RESERVE', 'SALE', 'RELEASE', 'IMPORT', 'ADJUSTMENT')`);
        await queryRunner.query(`CREATE TABLE "inventory_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ingredientId" uuid NOT NULL, "orderId" uuid, "type" "public"."inventory_transactions_type_enum" NOT NULL, "quantity" double precision NOT NULL, "stockBefore" double precision NOT NULL, "stockAfter" double precision NOT NULL, "note" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9b7144851f08f9eededde7edd42" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c0d81bca4247e4d97761963cbd" ON "inventory_transactions"  ("ingredientId") `);
        await queryRunner.query(`CREATE INDEX "IDX_38b238f0fa28acd6003582de9a" ON "inventory_transactions"  ("orderId") `);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_af929a5f2a400fdb6913b4967e1" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_recipes" ADD CONSTRAINT "FK_b0f36125dd7a6f1838bedcbad96" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_recipes" ADD CONSTRAINT "FK_43939a082b11572fe4e5a822831" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_ingredients" ADD CONSTRAINT "FK_8aed4ad4f4c2c588be135c820d9" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_ingredients" ADD CONSTRAINT "FK_e199138b648e4943ae530df1314" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_c0d81bca4247e4d97761963cbd9" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_38b238f0fa28acd6003582de9ad" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_38b238f0fa28acd6003582de9ad"`);
        await queryRunner.query(`ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_c0d81bca4247e4d97761963cbd9"`);
        await queryRunner.query(`ALTER TABLE "order_ingredients" DROP CONSTRAINT "FK_e199138b648e4943ae530df1314"`);
        await queryRunner.query(`ALTER TABLE "order_ingredients" DROP CONSTRAINT "FK_8aed4ad4f4c2c588be135c820d9"`);
        await queryRunner.query(`ALTER TABLE "product_recipes" DROP CONSTRAINT "FK_43939a082b11572fe4e5a822831"`);
        await queryRunner.query(`ALTER TABLE "product_recipes" DROP CONSTRAINT "FK_b0f36125dd7a6f1838bedcbad96"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_af929a5f2a400fdb6913b4967e1"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_38b238f0fa28acd6003582de9a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c0d81bca4247e4d97761963cbd"`);
        await queryRunner.query(`DROP TABLE "inventory_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."inventory_transactions_type_enum"`);
        await queryRunner.query(`DROP TABLE "order_ingredients"`);
        await queryRunner.query(`DROP TYPE "public"."order_ingredients_status_enum"`);
        await queryRunner.query(`DROP TABLE "product_recipes"`);
        await queryRunner.query(`DROP TABLE "ingredients"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payments_provider_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payments_method_enum"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`DROP TABLE "order_items"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
