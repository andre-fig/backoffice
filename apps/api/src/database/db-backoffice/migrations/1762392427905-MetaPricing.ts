import { MigrationInterface, QueryRunner } from "typeorm";

export class MetaPricing1762392427905 implements MigrationInterface {
    name = 'MetaPricing1762392427905'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_8474a87930e485c011409903ef"`);
        await queryRunner.query(`ALTER TABLE "analytics" DROP COLUMN "conversation_category"`);
        await queryRunner.query(`ALTER TABLE "analytics" DROP COLUMN "conversation_direction"`);
        await queryRunner.query(`ALTER TABLE "analytics" DROP COLUMN "conversation_count"`);
        await queryRunner.query(`ALTER TABLE "analytics" ADD "pricing_category" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "analytics" ADD "pricing_type" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "analytics" ADD "volume" integer NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f391d821e8ecee32b13f658f92" ON "analytics" ("line_id", "date", "pricing_category", "pricing_type") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_f391d821e8ecee32b13f658f92"`);
        await queryRunner.query(`ALTER TABLE "analytics" DROP COLUMN "volume"`);
        await queryRunner.query(`ALTER TABLE "analytics" DROP COLUMN "pricing_type"`);
        await queryRunner.query(`ALTER TABLE "analytics" DROP COLUMN "pricing_category"`);
        await queryRunner.query(`ALTER TABLE "analytics" ADD "conversation_count" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "analytics" ADD "conversation_direction" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "analytics" ADD "conversation_category" text NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8474a87930e485c011409903ef" ON "analytics" ("line_id", "date", "conversation_category", "conversation_direction") `);
    }

}
