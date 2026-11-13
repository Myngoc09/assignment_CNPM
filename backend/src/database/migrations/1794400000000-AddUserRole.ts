
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRole1794400000000 implements MigrationInterface {
    name = 'AddUserRole1794400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."users_role_enum"
            AS ENUM('CUSTOMER', 'ADMIN')
        `);

        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "role" "public"."users_role_enum"
            NOT NULL DEFAULT 'CUSTOMER'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "role"
        `);

        await queryRunner.query(`
            DROP TYPE "public"."users_role_enum"
        `);
    }
}
