import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUuidColumnsAndExternalIds1762376880000 implements MigrationInterface {
  name = 'AddUuidColumnsAndExternalIds1762376880000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`ALTER TABLE "im_wabas" ADD COLUMN "id" uuid DEFAULT uuid_generate_v4()`);
    await queryRunner.query(`ALTER TABLE "im_wabas" ADD COLUMN "external_id" text`);
    await queryRunner.query(`ALTER TABLE "im_wabas" ADD COLUMN "external_source" text DEFAULT 'META'`);

    await queryRunner.query(`UPDATE "im_wabas" SET "external_id" = "waba_id"`);

    await queryRunner.query(`ALTER TABLE "im_wabas" ALTER COLUMN "external_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "im_wabas" ALTER COLUMN "external_source" SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE "meta_lines" ADD COLUMN "id" uuid DEFAULT uuid_generate_v4()`);
    await queryRunner.query(`ALTER TABLE "meta_lines" ADD COLUMN "external_id" text`);
    await queryRunner.query(`ALTER TABLE "meta_lines" ADD COLUMN "external_source" text DEFAULT 'META'`);
    await queryRunner.query(`ALTER TABLE "meta_lines" ADD COLUMN "normalized_phone_number" text`);

    await queryRunner.query(`UPDATE "meta_lines" SET "external_id" = "line_id"`);

    await queryRunner.query(`UPDATE "meta_lines" SET "normalized_phone_number" = regexp_replace("display_phone_number", '[^0-9+]', '', 'g') WHERE "display_phone_number" IS NOT NULL`);

    await queryRunner.query(`ALTER TABLE "meta_lines" ALTER COLUMN "external_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "meta_lines" ALTER COLUMN "external_source" SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE "conversation_analytics" ADD COLUMN "id" uuid DEFAULT uuid_generate_v4()`);

    await queryRunner.query(`ALTER TABLE "conversation_analytics" ADD COLUMN "line_uuid" uuid`);

    await queryRunner.query(`
      UPDATE "conversation_analytics" ca
      SET "line_uuid" = ml."id"
      FROM "meta_lines" ml
      WHERE ca."line_id" = ml."line_id"
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_wabas_external_source_external_id" ON "im_wabas" ("external_source", "external_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_lines_external_source_external_id" ON "meta_lines" ("external_source", "external_id")`);

    await queryRunner.query(`CREATE INDEX "IDX_lines_normalized_phone_number" ON "meta_lines" ("normalized_phone_number")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lines_normalized_phone_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lines_external_source_external_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wabas_external_source_external_id"`);

    await queryRunner.query(`ALTER TABLE "conversation_analytics" DROP COLUMN IF EXISTS "line_uuid"`);
    await queryRunner.query(`ALTER TABLE "conversation_analytics" DROP COLUMN IF EXISTS "id"`);

    await queryRunner.query(`ALTER TABLE "meta_lines" DROP COLUMN IF EXISTS "normalized_phone_number"`);
    await queryRunner.query(`ALTER TABLE "meta_lines" DROP COLUMN IF EXISTS "external_source"`);
    await queryRunner.query(`ALTER TABLE "meta_lines" DROP COLUMN IF EXISTS "external_id"`);
    await queryRunner.query(`ALTER TABLE "meta_lines" DROP COLUMN IF EXISTS "id"`);

    await queryRunner.query(`ALTER TABLE "im_wabas" DROP COLUMN IF EXISTS "external_source"`);
    await queryRunner.query(`ALTER TABLE "im_wabas" DROP COLUMN IF EXISTS "external_id"`);
    await queryRunner.query(`ALTER TABLE "im_wabas" DROP COLUMN IF EXISTS "id"`);
  }
}
