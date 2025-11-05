import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTablesAndSwapPrimaryKeys1762376881000 implements MigrationInterface {
  name = 'RenameTablesAndSwapPrimaryKeys1762376881000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meta_lines" DROP CONSTRAINT IF EXISTS "FK_meta_lines_waba_id"`);
    await queryRunner.query(`ALTER TABLE "conversation_analytics" DROP CONSTRAINT IF EXISTS "FK_conversation_analytics_line_id"`);

    await queryRunner.query(`ALTER TABLE "im_wabas" DROP CONSTRAINT IF EXISTS "PK_im_wabas"`);
    await queryRunner.query(`ALTER TABLE "meta_lines" DROP CONSTRAINT IF EXISTS "PK_meta_lines"`);
    await queryRunner.query(`ALTER TABLE "conversation_analytics" DROP CONSTRAINT IF EXISTS "PK_conversation_analytics"`);

    await queryRunner.query(`ALTER TABLE "conversation_analytics" DROP CONSTRAINT IF EXISTS "UQ_conversation_analytics_line_date_category_direction"`);

    await queryRunner.query(`ALTER TABLE "im_wabas" ALTER COLUMN "id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "meta_lines" ALTER COLUMN "id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "conversation_analytics" ALTER COLUMN "id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "conversation_analytics" ALTER COLUMN "line_uuid" SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE "im_wabas" ADD CONSTRAINT "PK_im_wabas" PRIMARY KEY ("id")`);
    await queryRunner.query(`ALTER TABLE "meta_lines" ADD CONSTRAINT "PK_meta_lines" PRIMARY KEY ("id")`);
    await queryRunner.query(`ALTER TABLE "conversation_analytics" ADD CONSTRAINT "PK_conversation_analytics" PRIMARY KEY ("id")`);

    await queryRunner.query(`ALTER TABLE "meta_lines" ADD COLUMN "waba_uuid" uuid`);
    await queryRunner.query(`
      UPDATE "meta_lines" ml
      SET "waba_uuid" = w."id"
      FROM "im_wabas" w
      WHERE ml."waba_id" = w."waba_id"
    `);
    await queryRunner.query(`ALTER TABLE "meta_lines" ALTER COLUMN "waba_uuid" SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE "conversation_analytics" RENAME COLUMN "line_uuid" TO "line_id_new"`);

    await queryRunner.query(`ALTER TABLE "im_wabas" RENAME TO "wabas"`);
    await queryRunner.query(`ALTER TABLE "meta_lines" RENAME TO "lines"`);
    await queryRunner.query(`ALTER TABLE "conversation_analytics" RENAME TO "analytics"`);

    await queryRunner.query(`ALTER TABLE "wabas" DROP COLUMN "waba_id"`);
    await queryRunner.query(`ALTER TABLE "lines" DROP COLUMN "line_id"`);
    await queryRunner.query(`ALTER TABLE "lines" DROP COLUMN "waba_id"`);
    await queryRunner.query(`ALTER TABLE "analytics" DROP COLUMN "line_id"`);

    await queryRunner.query(`ALTER TABLE "lines" RENAME COLUMN "waba_uuid" TO "waba_id"`);
    await queryRunner.query(`ALTER TABLE "analytics" RENAME COLUMN "line_id_new" TO "line_id"`);

    await queryRunner.query(`ALTER TABLE "lines" ADD CONSTRAINT "FK_lines_waba_id" FOREIGN KEY ("waba_id") REFERENCES "wabas"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "analytics" ADD CONSTRAINT "FK_analytics_line_id" FOREIGN KEY ("line_id") REFERENCES "lines"("id") ON DELETE CASCADE`);

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_analytics_line_date_category_direction" ON "analytics" ("line_id", "date", "conversation_category", "conversation_direction")`);

    await queryRunner.query(`ALTER INDEX "IDX_wabas_external_source_external_id" RENAME TO "IDX_wabas_external"`);
    await queryRunner.query(`ALTER INDEX "IDX_lines_external_source_external_id" RENAME TO "IDX_lines_external"`);
    await queryRunner.query(`ALTER INDEX "IDX_lines_normalized_phone_number" RENAME TO "IDX_lines_normalized_phone"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('This migration cannot be safely reversed. Restore from backup if needed.');
  }
}
