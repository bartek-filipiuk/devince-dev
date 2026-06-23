import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "products_screenshots" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar
  );
  
  CREATE TABLE "_products_v_version_screenshots" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"caption" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "products_screenshots" ADD CONSTRAINT "products_screenshots_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_screenshots" ADD CONSTRAINT "products_screenshots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_screenshots" ADD CONSTRAINT "_products_v_version_screenshots_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_screenshots" ADD CONSTRAINT "_products_v_version_screenshots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_screenshots_order_idx" ON "products_screenshots" USING btree ("_order");
  CREATE INDEX "products_screenshots_parent_id_idx" ON "products_screenshots" USING btree ("_parent_id");
  CREATE INDEX "products_screenshots_image_idx" ON "products_screenshots" USING btree ("image_id");
  CREATE INDEX "_products_v_version_screenshots_order_idx" ON "_products_v_version_screenshots" USING btree ("_order");
  CREATE INDEX "_products_v_version_screenshots_parent_id_idx" ON "_products_v_version_screenshots" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_screenshots_image_idx" ON "_products_v_version_screenshots" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "products_screenshots" CASCADE;
  DROP TABLE "_products_v_version_screenshots" CASCADE;`)
}
