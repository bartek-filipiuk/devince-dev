import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "program_blocks_course_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "program_blocks_course_rich_text_locales" (
  	"heading" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "program_blocks_course_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "program_blocks_course_video_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "program_blocks_course_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "program_blocks_course_image_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "program_blocks_course_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"cta_url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "program_blocks_course_callout_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_program_v_blocks_course_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_program_v_blocks_course_rich_text_locales" (
  	"heading" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_program_v_blocks_course_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_program_v_blocks_course_video_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_program_v_blocks_course_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_program_v_blocks_course_image_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_program_v_blocks_course_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"cta_url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_program_v_blocks_course_callout_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "program_blocks_course_rich_text" ADD CONSTRAINT "program_blocks_course_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_blocks_course_rich_text_locales" ADD CONSTRAINT "program_blocks_course_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program_blocks_course_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_blocks_course_video" ADD CONSTRAINT "program_blocks_course_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_blocks_course_video_locales" ADD CONSTRAINT "program_blocks_course_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program_blocks_course_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_blocks_course_image" ADD CONSTRAINT "program_blocks_course_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "program_blocks_course_image" ADD CONSTRAINT "program_blocks_course_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_blocks_course_image_locales" ADD CONSTRAINT "program_blocks_course_image_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program_blocks_course_image"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_blocks_course_callout" ADD CONSTRAINT "program_blocks_course_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "program_blocks_course_callout_locales" ADD CONSTRAINT "program_blocks_course_callout_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."program_blocks_course_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_blocks_course_rich_text" ADD CONSTRAINT "_program_v_blocks_course_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_blocks_course_rich_text_locales" ADD CONSTRAINT "_program_v_blocks_course_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v_blocks_course_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_blocks_course_video" ADD CONSTRAINT "_program_v_blocks_course_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_blocks_course_video_locales" ADD CONSTRAINT "_program_v_blocks_course_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v_blocks_course_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_blocks_course_image" ADD CONSTRAINT "_program_v_blocks_course_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_program_v_blocks_course_image" ADD CONSTRAINT "_program_v_blocks_course_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_blocks_course_image_locales" ADD CONSTRAINT "_program_v_blocks_course_image_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v_blocks_course_image"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_blocks_course_callout" ADD CONSTRAINT "_program_v_blocks_course_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_program_v_blocks_course_callout_locales" ADD CONSTRAINT "_program_v_blocks_course_callout_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_program_v_blocks_course_callout"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "program_blocks_course_rich_text_order_idx" ON "program_blocks_course_rich_text" USING btree ("_order");
  CREATE INDEX "program_blocks_course_rich_text_parent_id_idx" ON "program_blocks_course_rich_text" USING btree ("_parent_id");
  CREATE INDEX "program_blocks_course_rich_text_path_idx" ON "program_blocks_course_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "program_blocks_course_rich_text_locales_locale_parent_id_uni" ON "program_blocks_course_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "program_blocks_course_video_order_idx" ON "program_blocks_course_video" USING btree ("_order");
  CREATE INDEX "program_blocks_course_video_parent_id_idx" ON "program_blocks_course_video" USING btree ("_parent_id");
  CREATE INDEX "program_blocks_course_video_path_idx" ON "program_blocks_course_video" USING btree ("_path");
  CREATE UNIQUE INDEX "program_blocks_course_video_locales_locale_parent_id_unique" ON "program_blocks_course_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "program_blocks_course_image_order_idx" ON "program_blocks_course_image" USING btree ("_order");
  CREATE INDEX "program_blocks_course_image_parent_id_idx" ON "program_blocks_course_image" USING btree ("_parent_id");
  CREATE INDEX "program_blocks_course_image_path_idx" ON "program_blocks_course_image" USING btree ("_path");
  CREATE INDEX "program_blocks_course_image_image_idx" ON "program_blocks_course_image" USING btree ("image_id");
  CREATE UNIQUE INDEX "program_blocks_course_image_locales_locale_parent_id_unique" ON "program_blocks_course_image_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "program_blocks_course_callout_order_idx" ON "program_blocks_course_callout" USING btree ("_order");
  CREATE INDEX "program_blocks_course_callout_parent_id_idx" ON "program_blocks_course_callout" USING btree ("_parent_id");
  CREATE INDEX "program_blocks_course_callout_path_idx" ON "program_blocks_course_callout" USING btree ("_path");
  CREATE UNIQUE INDEX "program_blocks_course_callout_locales_locale_parent_id_uniqu" ON "program_blocks_course_callout_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_program_v_blocks_course_rich_text_order_idx" ON "_program_v_blocks_course_rich_text" USING btree ("_order");
  CREATE INDEX "_program_v_blocks_course_rich_text_parent_id_idx" ON "_program_v_blocks_course_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_program_v_blocks_course_rich_text_path_idx" ON "_program_v_blocks_course_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_program_v_blocks_course_rich_text_locales_locale_parent_id_" ON "_program_v_blocks_course_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_program_v_blocks_course_video_order_idx" ON "_program_v_blocks_course_video" USING btree ("_order");
  CREATE INDEX "_program_v_blocks_course_video_parent_id_idx" ON "_program_v_blocks_course_video" USING btree ("_parent_id");
  CREATE INDEX "_program_v_blocks_course_video_path_idx" ON "_program_v_blocks_course_video" USING btree ("_path");
  CREATE UNIQUE INDEX "_program_v_blocks_course_video_locales_locale_parent_id_uniq" ON "_program_v_blocks_course_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_program_v_blocks_course_image_order_idx" ON "_program_v_blocks_course_image" USING btree ("_order");
  CREATE INDEX "_program_v_blocks_course_image_parent_id_idx" ON "_program_v_blocks_course_image" USING btree ("_parent_id");
  CREATE INDEX "_program_v_blocks_course_image_path_idx" ON "_program_v_blocks_course_image" USING btree ("_path");
  CREATE INDEX "_program_v_blocks_course_image_image_idx" ON "_program_v_blocks_course_image" USING btree ("image_id");
  CREATE UNIQUE INDEX "_program_v_blocks_course_image_locales_locale_parent_id_uniq" ON "_program_v_blocks_course_image_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_program_v_blocks_course_callout_order_idx" ON "_program_v_blocks_course_callout" USING btree ("_order");
  CREATE INDEX "_program_v_blocks_course_callout_parent_id_idx" ON "_program_v_blocks_course_callout" USING btree ("_parent_id");
  CREATE INDEX "_program_v_blocks_course_callout_path_idx" ON "_program_v_blocks_course_callout" USING btree ("_path");
  CREATE UNIQUE INDEX "_program_v_blocks_course_callout_locales_locale_parent_id_un" ON "_program_v_blocks_course_callout_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "program_blocks_course_rich_text" CASCADE;
  DROP TABLE "program_blocks_course_rich_text_locales" CASCADE;
  DROP TABLE "program_blocks_course_video" CASCADE;
  DROP TABLE "program_blocks_course_video_locales" CASCADE;
  DROP TABLE "program_blocks_course_image" CASCADE;
  DROP TABLE "program_blocks_course_image_locales" CASCADE;
  DROP TABLE "program_blocks_course_callout" CASCADE;
  DROP TABLE "program_blocks_course_callout_locales" CASCADE;
  DROP TABLE "_program_v_blocks_course_rich_text" CASCADE;
  DROP TABLE "_program_v_blocks_course_rich_text_locales" CASCADE;
  DROP TABLE "_program_v_blocks_course_video" CASCADE;
  DROP TABLE "_program_v_blocks_course_video_locales" CASCADE;
  DROP TABLE "_program_v_blocks_course_image" CASCADE;
  DROP TABLE "_program_v_blocks_course_image_locales" CASCADE;
  DROP TABLE "_program_v_blocks_course_callout" CASCADE;
  DROP TABLE "_program_v_blocks_course_callout_locales" CASCADE;`)
}
