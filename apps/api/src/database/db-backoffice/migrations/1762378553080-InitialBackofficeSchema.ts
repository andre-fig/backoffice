import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialBackofficeSchema1762378553080
  implements MigrationInterface
{
  name = 'InitialBackofficeSchema1762378553080';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE "lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "external_id" text NOT NULL, "external_source" text NOT NULL DEFAULT 'META', "normalized_phone_number" text, "display_phone_number" text, "verified_name" text, "name_status" text, "status" text, "quality_rating" text, "is_official_business_account" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "waba_id" uuid, CONSTRAINT "PK_155ad34738bc0e1aab0ca198dea" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c7e3d5a5836f537349c9987bfb" ON "lines" ("normalized_phone_number") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f35f5b200763d877309e7912d5" ON "lines" ("external_source", "external_id") `
    );
    await queryRunner.query(
      `CREATE TABLE "wabas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "external_id" text NOT NULL, "external_source" text NOT NULL DEFAULT 'META', "waba_name" text NOT NULL, "is_visible" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_aac128abae5c6a42b9c68286fd4" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1db3bcf3b3f9645152472576ed" ON "wabas" ("external_source", "external_id") `
    );
    await queryRunner.query(
      `CREATE TABLE "analytics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "line_id" uuid NOT NULL, "date" date NOT NULL, "conversation_category" text NOT NULL, "conversation_direction" text NOT NULL, "conversation_count" integer NOT NULL, "cost" numeric(10,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3c96dcbf1e4c57ea9e0c3144bff" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8474a87930e485c011409903ef" ON "analytics" ("line_id", "date", "conversation_category", "conversation_direction") `
    );
    await queryRunner.query(
      `ALTER TABLE "lines" ADD CONSTRAINT "FK_cdc11f027c07e1887f218a195d8" FOREIGN KEY ("waba_id") REFERENCES "wabas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "analytics" ADD CONSTRAINT "FK_bac7b214f366da38e7dc31c53e6" FOREIGN KEY ("line_id") REFERENCES "lines"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "analytics" DROP CONSTRAINT "FK_bac7b214f366da38e7dc31c53e6"`
    );
    await queryRunner.query(
      `ALTER TABLE "lines" DROP CONSTRAINT "FK_cdc11f027c07e1887f218a195d8"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8474a87930e485c011409903ef"`
    );
    await queryRunner.query(`DROP TABLE "analytics"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1db3bcf3b3f9645152472576ed"`
    );
    await queryRunner.query(`DROP TABLE "wabas"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f35f5b200763d877309e7912d5"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c7e3d5a5836f537349c9987bfb"`
    );
    await queryRunner.query(`DROP TABLE "lines"`);
  }
}
