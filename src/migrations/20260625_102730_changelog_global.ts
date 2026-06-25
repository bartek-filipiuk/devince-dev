import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_changelog_entries_notes_tag" AS ENUM('apps', 'courses', 'platform', 'security');
  CREATE TABLE "changelog_entries_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" "enum_changelog_entries_notes_tag" DEFAULT 'platform' NOT NULL
  );
  
  CREATE TABLE "changelog_entries_notes_locales" (
  	"text" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "changelog_entries" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"source_id" varchar
  );
  
  CREATE TABLE "changelog" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "changelog_entries_notes" ADD CONSTRAINT "changelog_entries_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."changelog_entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "changelog_entries_notes_locales" ADD CONSTRAINT "changelog_entries_notes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."changelog_entries_notes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."changelog"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "changelog_entries_notes_order_idx" ON "changelog_entries_notes" USING btree ("_order");
  CREATE INDEX "changelog_entries_notes_parent_id_idx" ON "changelog_entries_notes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "changelog_entries_notes_locales_locale_parent_id_unique" ON "changelog_entries_notes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "changelog_entries_order_idx" ON "changelog_entries" USING btree ("_order");
  CREATE INDEX "changelog_entries_parent_id_idx" ON "changelog_entries" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "changelog_entries_notes" CASCADE;
  DROP TABLE "changelog_entries_notes_locales" CASCADE;
  DROP TABLE "changelog_entries" CASCADE;
  DROP TABLE "changelog" CASCADE;
  DROP TYPE "public"."enum_changelog_entries_notes_tag";`)
}
