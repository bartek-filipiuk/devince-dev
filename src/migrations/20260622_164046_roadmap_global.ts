import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_roadmap_items_status" AS ENUM('planned', 'in_progress', 'done');
  CREATE TYPE "public"."enum_roadmap_items_track" AS ENUM('general', 'apps', 'courses');
  CREATE TABLE "roadmap_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"status" "enum_roadmap_items_status" DEFAULT 'planned' NOT NULL,
  	"track" "enum_roadmap_items_track" DEFAULT 'general' NOT NULL
  );
  
  CREATE TABLE "roadmap_items_locales" (
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "roadmap" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roadmap"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "roadmap_items_locales" ADD CONSTRAINT "roadmap_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."roadmap_items"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "roadmap_items_order_idx" ON "roadmap_items" USING btree ("_order");
  CREATE INDEX "roadmap_items_parent_id_idx" ON "roadmap_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "roadmap_items_locales_locale_parent_id_unique" ON "roadmap_items_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "roadmap_items" CASCADE;
  DROP TABLE "roadmap_items_locales" CASCADE;
  DROP TABLE "roadmap" CASCADE;
  DROP TYPE "public"."enum_roadmap_items_status";
  DROP TYPE "public"."enum_roadmap_items_track";`)
}
