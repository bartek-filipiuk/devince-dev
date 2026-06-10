import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Rename Program.phases member field `id` -> `letter`.
//
// The bug: the `phases` array member field was named `id`, and the import script
// set it to the phase letter (A–I). In Payload an array's `id` column is the row
// PRIMARY KEY (`program_phases.id varchar PRIMARY KEY`). Normally Payload fills it
// with an auto-generated UUID, but because a field was literally named `id`, the
// USER value (the letter) became the PK — globally unique across ALL programs.
// Result: only one program could ever hold phase "A".
//
// Fix: add a plain (non-unique) `letter` column and let Payload's auto-generated
// UUID populate `id`. We drop & recreate the phase tables so any old rows (whose
// `id` is a letter, not a UUID) are cleared — prod has no phases data yet and dev
// re-imports the course.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "program_phases" CASCADE;
  DROP TABLE "_program_v_version_phases" CASCADE;

  CREATE TABLE "program_phases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"letter" varchar,
  	"name" varchar,
  	"hint" varchar
  );

  CREATE TABLE "_program_v_version_phases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"letter" varchar,
  	"name" varchar,
  	"hint" varchar
  );

  ALTER TABLE "program_phases" ADD CONSTRAINT "program_phases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_phases" ADD CONSTRAINT "_program_v_version_phases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v"("id") ON DELETE cascade ON UPDATE no action;

  CREATE INDEX "program_phases_order_idx" ON "program_phases" USING btree ("_order");
  CREATE INDEX "program_phases_parent_id_idx" ON "program_phases" USING btree ("_parent_id");
  CREATE INDEX "_program_v_version_phases_order_idx" ON "_program_v_version_phases" USING btree ("_order");
  CREATE INDEX "_program_v_version_phases_parent_id_idx" ON "_program_v_version_phases" USING btree ("_parent_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "program_phases" CASCADE;
  DROP TABLE "_program_v_version_phases" CASCADE;

  CREATE TABLE "program_phases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"hint" varchar
  );

  CREATE TABLE "_program_v_version_phases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"name" varchar,
  	"hint" varchar
  );

  ALTER TABLE "program_phases" ADD CONSTRAINT "program_phases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_phases" ADD CONSTRAINT "_program_v_version_phases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v"("id") ON DELETE cascade ON UPDATE no action;

  CREATE INDEX "program_phases_order_idx" ON "program_phases" USING btree ("_order");
  CREATE INDEX "program_phases_parent_id_idx" ON "program_phases" USING btree ("_parent_id");
  CREATE INDEX "_program_v_version_phases_order_idx" ON "_program_v_version_phases" USING btree ("_order");
  CREATE INDEX "_program_v_version_phases_parent_id_idx" ON "_program_v_version_phases" USING btree ("_parent_id");`)
}
