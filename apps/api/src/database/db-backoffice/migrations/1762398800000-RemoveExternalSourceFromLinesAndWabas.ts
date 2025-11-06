import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveExternalSourceFromLinesAndWabas1762398800000
  implements MigrationInterface
{
  name = 'RemoveExternalSourceFromLinesAndWabas1762398800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop composite unique indexes that include external_source
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_f35f5b200763d877309e7912d5"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_1db3bcf3b3f9645152472576ed"`
    );

    // Remove external_source column from both tables
    await queryRunner.query(
      `ALTER TABLE "lines" DROP COLUMN IF EXISTS "external_source"`
    );
    await queryRunner.query(
      `ALTER TABLE "wabas" DROP COLUMN IF EXISTS "external_source"`
    );

    // Create new unique indexes on external_id only, matching current entity definitions
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_lines_external_id_unique" ON "lines" ("external_id") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_wabas_external_id_unique" ON "wabas" ("external_id") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new unique indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_wabas_external_id_unique"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_lines_external_id_unique"`
    );

    // Recreate external_source column with the original default
    await queryRunner.query(
      `ALTER TABLE "wabas" ADD "external_source" text NOT NULL DEFAULT 'META'`
    );
    await queryRunner.query(
      `ALTER TABLE "lines" ADD "external_source" text NOT NULL DEFAULT 'META'`
    );

    // Restore original composite unique indexes
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1db3bcf3b3f9645152472576ed" ON "wabas" ("external_source", "external_id") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f35f5b200763d877309e7912d5" ON "lines" ("external_source", "external_id") `
    );
  }
}
