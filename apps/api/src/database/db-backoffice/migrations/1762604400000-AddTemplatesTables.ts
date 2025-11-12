import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTemplatesTables1762604400000 implements MigrationInterface {
  name = 'AddTemplatesTables1762604400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "waba_id" uuid NOT NULL,
        "external_id" text NOT NULL,
        "name" text NOT NULL,
        "language" text NOT NULL,
        "category" text,
        "status" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_templates_id" PRIMARY KEY ("id")
      )`
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_templates_waba_external" ON "templates" ("waba_id", "external_id")`
    );

    await queryRunner.query(
      `ALTER TABLE "templates"
        ADD CONSTRAINT "FK_templates_waba"
        FOREIGN KEY ("waba_id") REFERENCES "wabas"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `CREATE TABLE "template_analytics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL,
        "date" date NOT NULL,
        "granularity" text NOT NULL DEFAULT 'DAILY',
        "sent" integer NOT NULL DEFAULT 0,
        "delivered" integer NOT NULL DEFAULT 0,
        "read" integer NOT NULL DEFAULT 0,
        "cost_amount" numeric(12,6) NOT NULL DEFAULT 0,
        "cost_per_delivered" numeric(12,6) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_template_analytics_id" PRIMARY KEY ("id")
      )`
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_template_analytics_template_date" ON "template_analytics" ("template_id", "date")`
    );

    await queryRunner.query(
      `ALTER TABLE "template_analytics"
        ADD CONSTRAINT "FK_template_analytics_template"
        FOREIGN KEY ("template_id") REFERENCES "templates"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "template_analytics" DROP CONSTRAINT "FK_template_analytics_template"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_template_analytics_template_date"`
    );
    await queryRunner.query(`DROP TABLE "template_analytics"`);

    await queryRunner.query(
      `ALTER TABLE "templates" DROP CONSTRAINT "FK_templates_waba"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_templates_waba_external"`
    );
    await queryRunner.query(`DROP TABLE "templates"`);
  }
}
