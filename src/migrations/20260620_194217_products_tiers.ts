import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_tiers_currency" AS ENUM('usd', 'eur', 'pln');
  CREATE TYPE "public"."enum__products_v_version_tiers_currency" AS ENUM('usd', 'eur', 'pln');
  CREATE TABLE "products_tiers_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar
  );
  
  CREATE TABLE "products_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"price_cents" numeric,
  	"currency" "enum_products_tiers_currency" DEFAULT 'usd',
  	"tagline" varchar,
  	"recommended" boolean
  );
  
  CREATE TABLE "_products_v_version_tiers_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"price_cents" numeric,
  	"currency" "enum__products_v_version_tiers_currency" DEFAULT 'usd',
  	"tagline" varchar,
  	"recommended" boolean,
  	"_uuid" varchar
  );
  
  ALTER TABLE "products_tiers_features" ADD CONSTRAINT "products_tiers_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_tiers" ADD CONSTRAINT "products_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_tiers_features" ADD CONSTRAINT "_products_v_version_tiers_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_version_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_tiers" ADD CONSTRAINT "_products_v_version_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_tiers_features_order_idx" ON "products_tiers_features" USING btree ("_order");
  CREATE INDEX "products_tiers_features_parent_id_idx" ON "products_tiers_features" USING btree ("_parent_id");
  CREATE INDEX "products_tiers_order_idx" ON "products_tiers" USING btree ("_order");
  CREATE INDEX "products_tiers_parent_id_idx" ON "products_tiers" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_tiers_features_order_idx" ON "_products_v_version_tiers_features" USING btree ("_order");
  CREATE INDEX "_products_v_version_tiers_features_parent_id_idx" ON "_products_v_version_tiers_features" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_tiers_order_idx" ON "_products_v_version_tiers" USING btree ("_order");
  CREATE INDEX "_products_v_version_tiers_parent_id_idx" ON "_products_v_version_tiers" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "products_tiers_features" CASCADE;
  DROP TABLE "products_tiers" CASCADE;
  DROP TABLE "_products_v_version_tiers_features" CASCADE;
  DROP TABLE "_products_v_version_tiers" CASCADE;
  DROP TYPE "public"."enum_products_tiers_currency";
  DROP TYPE "public"."enum__products_v_version_tiers_currency";`)
}
