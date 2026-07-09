import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_build_log_hero_primary_c_t_a_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_build_log_hero_primary_c_t_a_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "public"."enum_pages_blocks_build_log_hero_secondary_c_t_a_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_pages_blocks_build_log_hero_secondary_c_t_a_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "public"."enum__pages_v_blocks_build_log_hero_primary_c_t_a_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_build_log_hero_primary_c_t_a_appearance" AS ENUM('default', 'outline');
  CREATE TYPE "public"."enum__pages_v_blocks_build_log_hero_secondary_c_t_a_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum__pages_v_blocks_build_log_hero_secondary_c_t_a_appearance" AS ENUM('default', 'outline');
  CREATE TABLE "pages_blocks_build_log_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"primary_c_t_a_type" "enum_pages_blocks_build_log_hero_primary_c_t_a_type" DEFAULT 'reference',
  	"primary_c_t_a_new_tab" boolean,
  	"primary_c_t_a_url" varchar,
  	"primary_c_t_a_label" varchar,
  	"primary_c_t_a_appearance" "enum_pages_blocks_build_log_hero_primary_c_t_a_appearance" DEFAULT 'default',
  	"secondary_c_t_a_type" "enum_pages_blocks_build_log_hero_secondary_c_t_a_type" DEFAULT 'reference',
  	"secondary_c_t_a_new_tab" boolean,
  	"secondary_c_t_a_url" varchar,
  	"secondary_c_t_a_label" varchar,
  	"secondary_c_t_a_appearance" "enum_pages_blocks_build_log_hero_secondary_c_t_a_appearance" DEFAULT 'default',
  	"show_log" boolean DEFAULT true,
  	"show_stats" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_build_log_hero_locales" (
  	"eyebrow" varchar DEFAULT 'devince.dev / solo builder / Wrocław',
  	"headline" varchar,
  	"lede" jsonb,
  	"custom_stat_label" varchar,
  	"custom_stat_value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_build_log_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"primary_c_t_a_type" "enum__pages_v_blocks_build_log_hero_primary_c_t_a_type" DEFAULT 'reference',
  	"primary_c_t_a_new_tab" boolean,
  	"primary_c_t_a_url" varchar,
  	"primary_c_t_a_label" varchar,
  	"primary_c_t_a_appearance" "enum__pages_v_blocks_build_log_hero_primary_c_t_a_appearance" DEFAULT 'default',
  	"secondary_c_t_a_type" "enum__pages_v_blocks_build_log_hero_secondary_c_t_a_type" DEFAULT 'reference',
  	"secondary_c_t_a_new_tab" boolean,
  	"secondary_c_t_a_url" varchar,
  	"secondary_c_t_a_label" varchar,
  	"secondary_c_t_a_appearance" "enum__pages_v_blocks_build_log_hero_secondary_c_t_a_appearance" DEFAULT 'default',
  	"show_log" boolean DEFAULT true,
  	"show_stats" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_build_log_hero_locales" (
  	"eyebrow" varchar DEFAULT 'devince.dev / solo builder / Wrocław',
  	"headline" varchar,
  	"lede" jsonb,
  	"custom_stat_label" varchar,
  	"custom_stat_value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "pages_blocks_build_log_hero" ADD CONSTRAINT "pages_blocks_build_log_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_build_log_hero_locales" ADD CONSTRAINT "pages_blocks_build_log_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_build_log_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_build_log_hero" ADD CONSTRAINT "_pages_v_blocks_build_log_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_build_log_hero_locales" ADD CONSTRAINT "_pages_v_blocks_build_log_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_build_log_hero"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_build_log_hero_order_idx" ON "pages_blocks_build_log_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_build_log_hero_parent_id_idx" ON "pages_blocks_build_log_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_build_log_hero_path_idx" ON "pages_blocks_build_log_hero" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_build_log_hero_locales_locale_parent_id_unique" ON "pages_blocks_build_log_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_build_log_hero_order_idx" ON "_pages_v_blocks_build_log_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_build_log_hero_parent_id_idx" ON "_pages_v_blocks_build_log_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_build_log_hero_path_idx" ON "_pages_v_blocks_build_log_hero" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_build_log_hero_locales_locale_parent_id_uniq" ON "_pages_v_blocks_build_log_hero_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_build_log_hero" CASCADE;
  DROP TABLE "pages_blocks_build_log_hero_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_build_log_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_build_log_hero_locales" CASCADE;
  DROP TYPE "public"."enum_pages_blocks_build_log_hero_primary_c_t_a_type";
  DROP TYPE "public"."enum_pages_blocks_build_log_hero_primary_c_t_a_appearance";
  DROP TYPE "public"."enum_pages_blocks_build_log_hero_secondary_c_t_a_type";
  DROP TYPE "public"."enum_pages_blocks_build_log_hero_secondary_c_t_a_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_build_log_hero_primary_c_t_a_type";
  DROP TYPE "public"."enum__pages_v_blocks_build_log_hero_primary_c_t_a_appearance";
  DROP TYPE "public"."enum__pages_v_blocks_build_log_hero_secondary_c_t_a_type";
  DROP TYPE "public"."enum__pages_v_blocks_build_log_hero_secondary_c_t_a_appearance";`)
}
