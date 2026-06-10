import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_program_level" AS ENUM('beginner', 'intermediate', 'advanced');
  CREATE TYPE "public"."enum__program_v_version_level" AS ENUM('beginner', 'intermediate', 'advanced');
  CREATE TYPE "public"."enum_lessons_kind" AS ENUM('normal', 'decision');
  CREATE TYPE "public"."enum__lessons_v_version_kind" AS ENUM('normal', 'decision');
  CREATE TABLE "program_phases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"hint" varchar
  );
  
  CREATE TABLE "program_outcomes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar
  );
  
  CREATE TABLE "program_audience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar
  );
  
  CREATE TABLE "program_requirements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar
  );
  
  CREATE TABLE "_program_v_version_phases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"name" varchar,
  	"hint" varchar
  );
  
  CREATE TABLE "_program_v_version_outcomes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_program_v_version_audience" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_program_v_version_requirements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "lessons_skills" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"skill" varchar
  );
  
  CREATE TABLE "lessons_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"lessons_id" integer
  );
  
  CREATE TABLE "_lessons_v_version_skills" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"skill" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_lessons_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"lessons_id" integer
  );
  
  ALTER TABLE "program" ADD COLUMN "level" "enum_program_level";
  ALTER TABLE "_program_v" ADD COLUMN "version_level" "enum__program_v_version_level";
  ALTER TABLE "lessons" ADD COLUMN "nr" numeric;
  ALTER TABLE "lessons" ADD COLUMN "phase_id" varchar;
  ALTER TABLE "lessons" ADD COLUMN "hard_gate" boolean;
  ALTER TABLE "lessons" ADD COLUMN "hybrid" boolean;
  ALTER TABLE "lessons" ADD COLUMN "kind" "enum_lessons_kind" DEFAULT 'normal';
  ALTER TABLE "lessons" ADD COLUMN "est_time_min_min" numeric;
  ALTER TABLE "lessons" ADD COLUMN "est_time_min_max" numeric;
  ALTER TABLE "lessons" ADD COLUMN "why" varchar;
  ALTER TABLE "lessons" ADD COLUMN "what" varchar;
  ALTER TABLE "lessons" ADD COLUMN "dod" varchar;
  ALTER TABLE "_lessons_v" ADD COLUMN "version_nr" numeric;
  ALTER TABLE "_lessons_v" ADD COLUMN "version_phase_id" varchar;
  ALTER TABLE "_lessons_v" ADD COLUMN "version_hard_gate" boolean;
  ALTER TABLE "_lessons_v" ADD COLUMN "version_hybrid" boolean;
  ALTER TABLE "_lessons_v" ADD COLUMN "version_kind" "enum__lessons_v_version_kind" DEFAULT 'normal';
  ALTER TABLE "_lessons_v" ADD COLUMN "version_est_time_min_min" numeric;
  ALTER TABLE "_lessons_v" ADD COLUMN "version_est_time_min_max" numeric;
  ALTER TABLE "_lessons_v" ADD COLUMN "version_why" varchar;
  ALTER TABLE "_lessons_v" ADD COLUMN "version_what" varchar;
  ALTER TABLE "_lessons_v" ADD COLUMN "version_dod" varchar;
  ALTER TABLE "program_phases" ADD CONSTRAINT "program_phases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_outcomes" ADD CONSTRAINT "program_outcomes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_audience" ADD CONSTRAINT "program_audience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_requirements" ADD CONSTRAINT "program_requirements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_phases" ADD CONSTRAINT "_program_v_version_phases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_outcomes" ADD CONSTRAINT "_program_v_version_outcomes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_audience" ADD CONSTRAINT "_program_v_version_audience_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_requirements" ADD CONSTRAINT "_program_v_version_requirements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lessons_skills" ADD CONSTRAINT "lessons_skills_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lessons_rels" ADD CONSTRAINT "lessons_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lessons_rels" ADD CONSTRAINT "lessons_rels_lessons_fk" FOREIGN KEY ("lessons_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lessons_v_version_skills" ADD CONSTRAINT "_lessons_v_version_skills_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lessons_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lessons_v_rels" ADD CONSTRAINT "_lessons_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_lessons_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lessons_v_rels" ADD CONSTRAINT "_lessons_v_rels_lessons_fk" FOREIGN KEY ("lessons_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "program_phases_order_idx" ON "program_phases" USING btree ("_order");
  CREATE INDEX "program_phases_parent_id_idx" ON "program_phases" USING btree ("_parent_id");
  CREATE INDEX "program_outcomes_order_idx" ON "program_outcomes" USING btree ("_order");
  CREATE INDEX "program_outcomes_parent_id_idx" ON "program_outcomes" USING btree ("_parent_id");
  CREATE INDEX "program_audience_order_idx" ON "program_audience" USING btree ("_order");
  CREATE INDEX "program_audience_parent_id_idx" ON "program_audience" USING btree ("_parent_id");
  CREATE INDEX "program_requirements_order_idx" ON "program_requirements" USING btree ("_order");
  CREATE INDEX "program_requirements_parent_id_idx" ON "program_requirements" USING btree ("_parent_id");
  CREATE INDEX "_program_v_version_phases_order_idx" ON "_program_v_version_phases" USING btree ("_order");
  CREATE INDEX "_program_v_version_phases_parent_id_idx" ON "_program_v_version_phases" USING btree ("_parent_id");
  CREATE INDEX "_program_v_version_outcomes_order_idx" ON "_program_v_version_outcomes" USING btree ("_order");
  CREATE INDEX "_program_v_version_outcomes_parent_id_idx" ON "_program_v_version_outcomes" USING btree ("_parent_id");
  CREATE INDEX "_program_v_version_audience_order_idx" ON "_program_v_version_audience" USING btree ("_order");
  CREATE INDEX "_program_v_version_audience_parent_id_idx" ON "_program_v_version_audience" USING btree ("_parent_id");
  CREATE INDEX "_program_v_version_requirements_order_idx" ON "_program_v_version_requirements" USING btree ("_order");
  CREATE INDEX "_program_v_version_requirements_parent_id_idx" ON "_program_v_version_requirements" USING btree ("_parent_id");
  CREATE INDEX "lessons_skills_order_idx" ON "lessons_skills" USING btree ("_order");
  CREATE INDEX "lessons_skills_parent_id_idx" ON "lessons_skills" USING btree ("_parent_id");
  CREATE INDEX "lessons_rels_order_idx" ON "lessons_rels" USING btree ("order");
  CREATE INDEX "lessons_rels_parent_idx" ON "lessons_rels" USING btree ("parent_id");
  CREATE INDEX "lessons_rels_path_idx" ON "lessons_rels" USING btree ("path");
  CREATE INDEX "lessons_rels_lessons_id_idx" ON "lessons_rels" USING btree ("lessons_id");
  CREATE INDEX "_lessons_v_version_skills_order_idx" ON "_lessons_v_version_skills" USING btree ("_order");
  CREATE INDEX "_lessons_v_version_skills_parent_id_idx" ON "_lessons_v_version_skills" USING btree ("_parent_id");
  CREATE INDEX "_lessons_v_rels_order_idx" ON "_lessons_v_rels" USING btree ("order");
  CREATE INDEX "_lessons_v_rels_parent_idx" ON "_lessons_v_rels" USING btree ("parent_id");
  CREATE INDEX "_lessons_v_rels_path_idx" ON "_lessons_v_rels" USING btree ("path");
  CREATE INDEX "_lessons_v_rels_lessons_id_idx" ON "_lessons_v_rels" USING btree ("lessons_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "program_phases" CASCADE;
  DROP TABLE "program_outcomes" CASCADE;
  DROP TABLE "program_audience" CASCADE;
  DROP TABLE "program_requirements" CASCADE;
  DROP TABLE "_program_v_version_phases" CASCADE;
  DROP TABLE "_program_v_version_outcomes" CASCADE;
  DROP TABLE "_program_v_version_audience" CASCADE;
  DROP TABLE "_program_v_version_requirements" CASCADE;
  DROP TABLE "lessons_skills" CASCADE;
  DROP TABLE "lessons_rels" CASCADE;
  DROP TABLE "_lessons_v_version_skills" CASCADE;
  DROP TABLE "_lessons_v_rels" CASCADE;
  ALTER TABLE "program" DROP COLUMN "level";
  ALTER TABLE "_program_v" DROP COLUMN "version_level";
  ALTER TABLE "lessons" DROP COLUMN "nr";
  ALTER TABLE "lessons" DROP COLUMN "phase_id";
  ALTER TABLE "lessons" DROP COLUMN "hard_gate";
  ALTER TABLE "lessons" DROP COLUMN "hybrid";
  ALTER TABLE "lessons" DROP COLUMN "kind";
  ALTER TABLE "lessons" DROP COLUMN "est_time_min_min";
  ALTER TABLE "lessons" DROP COLUMN "est_time_min_max";
  ALTER TABLE "lessons" DROP COLUMN "why";
  ALTER TABLE "lessons" DROP COLUMN "what";
  ALTER TABLE "lessons" DROP COLUMN "dod";
  ALTER TABLE "_lessons_v" DROP COLUMN "version_nr";
  ALTER TABLE "_lessons_v" DROP COLUMN "version_phase_id";
  ALTER TABLE "_lessons_v" DROP COLUMN "version_hard_gate";
  ALTER TABLE "_lessons_v" DROP COLUMN "version_hybrid";
  ALTER TABLE "_lessons_v" DROP COLUMN "version_kind";
  ALTER TABLE "_lessons_v" DROP COLUMN "version_est_time_min_min";
  ALTER TABLE "_lessons_v" DROP COLUMN "version_est_time_min_max";
  ALTER TABLE "_lessons_v" DROP COLUMN "version_why";
  ALTER TABLE "_lessons_v" DROP COLUMN "version_what";
  ALTER TABLE "_lessons_v" DROP COLUMN "version_dod";
  DROP TYPE "public"."enum_program_level";
  DROP TYPE "public"."enum__program_v_version_level";
  DROP TYPE "public"."enum_lessons_kind";
  DROP TYPE "public"."enum__lessons_v_version_kind";`)
}
