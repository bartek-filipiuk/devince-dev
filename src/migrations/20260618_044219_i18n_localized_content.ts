import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "program_phases_locales" (
  	"name" varchar,
  	"hint" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "program_outcomes_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "program_audience_locales" (
  	"item" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "program_requirements_locales" (
  	"item" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_program_v_version_phases_locales" (
  	"name" varchar,
  	"hint" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_program_v_version_outcomes_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_program_v_version_audience_locales" (
  	"item" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_program_v_version_requirements_locales" (
  	"item" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "lessons_locales" (
  	"title" varchar,
  	"why" varchar,
  	"what" varchar,
  	"dod" varchar,
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_lessons_v_locales" (
  	"version_title" varchar,
  	"version_why" varchar,
  	"version_what" varchar,
  	"version_dod" varchar,
  	"version_content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "products_locales" ADD COLUMN "title" varchar;
  ALTER TABLE "products_locales" ADD COLUMN "description" jsonb;
  ALTER TABLE "_products_v_locales" ADD COLUMN "version_title" varchar;
  ALTER TABLE "_products_v_locales" ADD COLUMN "version_description" jsonb;
  ALTER TABLE "program_phases_locales" ADD CONSTRAINT "program_phases_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program_phases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_outcomes_locales" ADD CONSTRAINT "program_outcomes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program_outcomes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_audience_locales" ADD CONSTRAINT "program_audience_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program_audience"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_requirements_locales" ADD CONSTRAINT "program_requirements_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program_requirements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_phases_locales" ADD CONSTRAINT "_program_v_version_phases_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v_version_phases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_outcomes_locales" ADD CONSTRAINT "_program_v_version_outcomes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v_version_outcomes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_audience_locales" ADD CONSTRAINT "_program_v_version_audience_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v_version_audience"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_version_requirements_locales" ADD CONSTRAINT "_program_v_version_requirements_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v_version_requirements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "lessons_locales" ADD CONSTRAINT "lessons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_lessons_v_locales" ADD CONSTRAINT "_lessons_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_lessons_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "program_phases_locales_locale_parent_id_unique" ON "program_phases_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "program_outcomes_locales_locale_parent_id_unique" ON "program_outcomes_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "program_audience_locales_locale_parent_id_unique" ON "program_audience_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "program_requirements_locales_locale_parent_id_unique" ON "program_requirements_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_program_v_version_phases_locales_locale_parent_id_unique" ON "_program_v_version_phases_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_program_v_version_outcomes_locales_locale_parent_id_unique" ON "_program_v_version_outcomes_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_program_v_version_audience_locales_locale_parent_id_unique" ON "_program_v_version_audience_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_program_v_version_requirements_locales_locale_parent_id_uni" ON "_program_v_version_requirements_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "lessons_locales_locale_parent_id_unique" ON "lessons_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_lessons_v_locales_locale_parent_id_unique" ON "_lessons_v_locales" USING btree ("_locale","_parent_id");

  -- =====================================================================
  -- DATA PRESERVATION (must run BEFORE the DROP COLUMN statements below).
  -- Copy every now-localized base-table value into its 'pl' _locales row so
  -- nothing is lost when the base columns are dropped. ON CONFLICT keeps any
  -- pre-existing locale rows (e.g. an 'en' row) untouched and only fills the
  -- moved columns for the 'pl' row. Each _locales row's _parent_id references
  -- its IMMEDIATE parent's id (collection id for products/lessons; the array
  -- row's own id for the program syllabus arrays).
  -- =====================================================================

  -- Products (live + versions)
  INSERT INTO "products_locales" ("_locale", "_parent_id", "title", "description")
  SELECT 'pl', "id", "title", "description" FROM "products"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "title" = EXCLUDED."title", "description" = EXCLUDED."description";

  INSERT INTO "_products_v_locales" ("_locale", "_parent_id", "version_title", "version_description")
  SELECT 'pl', "id", "version_title", "version_description" FROM "_products_v"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "version_title" = EXCLUDED."version_title", "version_description" = EXCLUDED."version_description";

  -- Lessons (live + versions)
  INSERT INTO "lessons_locales" ("_locale", "_parent_id", "title", "why", "what", "dod", "content")
  SELECT 'pl', "id", "title", "why", "what", "dod", "content" FROM "lessons"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "title" = EXCLUDED."title", "why" = EXCLUDED."why", "what" = EXCLUDED."what", "dod" = EXCLUDED."dod", "content" = EXCLUDED."content";

  INSERT INTO "_lessons_v_locales" ("_locale", "_parent_id", "version_title", "version_why", "version_what", "version_dod", "version_content")
  SELECT 'pl', "id", "version_title", "version_why", "version_what", "version_dod", "version_content" FROM "_lessons_v"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "version_title" = EXCLUDED."version_title", "version_why" = EXCLUDED."version_why", "version_what" = EXCLUDED."version_what", "version_dod" = EXCLUDED."version_dod", "version_content" = EXCLUDED."version_content";

  -- Program syllabus arrays (live) — _parent_id references the array row's varchar id
  INSERT INTO "program_phases_locales" ("_locale", "_parent_id", "name", "hint")
  SELECT 'pl', "id", "name", "hint" FROM "program_phases"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "name" = EXCLUDED."name", "hint" = EXCLUDED."hint";

  INSERT INTO "program_outcomes_locales" ("_locale", "_parent_id", "title", "body")
  SELECT 'pl', "id", "title", "body" FROM "program_outcomes"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "title" = EXCLUDED."title", "body" = EXCLUDED."body";

  INSERT INTO "program_audience_locales" ("_locale", "_parent_id", "item")
  SELECT 'pl', "id", "item" FROM "program_audience"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "item" = EXCLUDED."item";

  INSERT INTO "program_requirements_locales" ("_locale", "_parent_id", "item")
  SELECT 'pl', "id", "item" FROM "program_requirements"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "item" = EXCLUDED."item";

  -- Program syllabus arrays (versions) — _parent_id references the version array row's integer id
  INSERT INTO "_program_v_version_phases_locales" ("_locale", "_parent_id", "name", "hint")
  SELECT 'pl', "id", "name", "hint" FROM "_program_v_version_phases"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "name" = EXCLUDED."name", "hint" = EXCLUDED."hint";

  INSERT INTO "_program_v_version_outcomes_locales" ("_locale", "_parent_id", "title", "body")
  SELECT 'pl', "id", "title", "body" FROM "_program_v_version_outcomes"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "title" = EXCLUDED."title", "body" = EXCLUDED."body";

  INSERT INTO "_program_v_version_audience_locales" ("_locale", "_parent_id", "item")
  SELECT 'pl', "id", "item" FROM "_program_v_version_audience"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "item" = EXCLUDED."item";

  INSERT INTO "_program_v_version_requirements_locales" ("_locale", "_parent_id", "item")
  SELECT 'pl', "id", "item" FROM "_program_v_version_requirements"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "item" = EXCLUDED."item";
  -- ===================== END DATA PRESERVATION =========================

  ALTER TABLE "program_phases" DROP COLUMN "name";
  ALTER TABLE "program_phases" DROP COLUMN "hint";
  ALTER TABLE "program_outcomes" DROP COLUMN "title";
  ALTER TABLE "program_outcomes" DROP COLUMN "body";
  ALTER TABLE "program_audience" DROP COLUMN "item";
  ALTER TABLE "program_requirements" DROP COLUMN "item";
  ALTER TABLE "_program_v_version_phases" DROP COLUMN "name";
  ALTER TABLE "_program_v_version_phases" DROP COLUMN "hint";
  ALTER TABLE "_program_v_version_outcomes" DROP COLUMN "title";
  ALTER TABLE "_program_v_version_outcomes" DROP COLUMN "body";
  ALTER TABLE "_program_v_version_audience" DROP COLUMN "item";
  ALTER TABLE "_program_v_version_requirements" DROP COLUMN "item";
  ALTER TABLE "lessons" DROP COLUMN "title";
  ALTER TABLE "lessons" DROP COLUMN "why";
  ALTER TABLE "lessons" DROP COLUMN "what";
  ALTER TABLE "lessons" DROP COLUMN "dod";
  ALTER TABLE "lessons" DROP COLUMN "content";
  ALTER TABLE "_lessons_v" DROP COLUMN "version_title";
  ALTER TABLE "_lessons_v" DROP COLUMN "version_why";
  ALTER TABLE "_lessons_v" DROP COLUMN "version_what";
  ALTER TABLE "_lessons_v" DROP COLUMN "version_dod";
  ALTER TABLE "_lessons_v" DROP COLUMN "version_content";
  ALTER TABLE "products" DROP COLUMN "title";
  ALTER TABLE "products" DROP COLUMN "description";
  ALTER TABLE "_products_v" DROP COLUMN "version_title";
  ALTER TABLE "_products_v" DROP COLUMN "version_description";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "program_phases_locales" CASCADE;
  DROP TABLE "program_outcomes_locales" CASCADE;
  DROP TABLE "program_audience_locales" CASCADE;
  DROP TABLE "program_requirements_locales" CASCADE;
  DROP TABLE "_program_v_version_phases_locales" CASCADE;
  DROP TABLE "_program_v_version_outcomes_locales" CASCADE;
  DROP TABLE "_program_v_version_audience_locales" CASCADE;
  DROP TABLE "_program_v_version_requirements_locales" CASCADE;
  DROP TABLE "lessons_locales" CASCADE;
  DROP TABLE "_lessons_v_locales" CASCADE;
  ALTER TABLE "program_phases" ADD COLUMN "name" varchar;
  ALTER TABLE "program_phases" ADD COLUMN "hint" varchar;
  ALTER TABLE "program_outcomes" ADD COLUMN "title" varchar;
  ALTER TABLE "program_outcomes" ADD COLUMN "body" varchar;
  ALTER TABLE "program_audience" ADD COLUMN "item" varchar;
  ALTER TABLE "program_requirements" ADD COLUMN "item" varchar;
  ALTER TABLE "_program_v_version_phases" ADD COLUMN "name" varchar;
  ALTER TABLE "_program_v_version_phases" ADD COLUMN "hint" varchar;
  ALTER TABLE "_program_v_version_outcomes" ADD COLUMN "title" varchar;
  ALTER TABLE "_program_v_version_outcomes" ADD COLUMN "body" varchar;
  ALTER TABLE "_program_v_version_audience" ADD COLUMN "item" varchar;
  ALTER TABLE "_program_v_version_requirements" ADD COLUMN "item" varchar;
  ALTER TABLE "lessons" ADD COLUMN "title" varchar;
  ALTER TABLE "lessons" ADD COLUMN "why" varchar;
  ALTER TABLE "lessons" ADD COLUMN "what" varchar;
  ALTER TABLE "lessons" ADD COLUMN "dod" varchar;
  ALTER TABLE "lessons" ADD COLUMN "content" jsonb;
  ALTER TABLE "_lessons_v" ADD COLUMN "version_title" varchar;
  ALTER TABLE "_lessons_v" ADD COLUMN "version_why" varchar;
  ALTER TABLE "_lessons_v" ADD COLUMN "version_what" varchar;
  ALTER TABLE "_lessons_v" ADD COLUMN "version_dod" varchar;
  ALTER TABLE "_lessons_v" ADD COLUMN "version_content" jsonb;
  ALTER TABLE "products" ADD COLUMN "title" varchar;
  ALTER TABLE "products" ADD COLUMN "description" jsonb;
  ALTER TABLE "_products_v" ADD COLUMN "version_title" varchar;
  ALTER TABLE "_products_v" ADD COLUMN "version_description" jsonb;
  ALTER TABLE "products_locales" DROP COLUMN "title";
  ALTER TABLE "products_locales" DROP COLUMN "description";
  ALTER TABLE "_products_v_locales" DROP COLUMN "version_title";
  ALTER TABLE "_products_v_locales" DROP COLUMN "version_description";`)
}
