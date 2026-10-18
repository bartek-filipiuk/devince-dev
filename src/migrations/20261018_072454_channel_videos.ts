import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "videos_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"t_ms" numeric NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "videos_public_files" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"content" varchar NOT NULL
  );
  
  CREATE TABLE "videos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"youtube_id" varchar NOT NULL,
  	"published_at" timestamp(3) with time zone NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"summary" varchar,
  	"description" varchar,
  	"tags" jsonb,
  	"transcript" varchar,
  	"product_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "videos_id" integer;
  ALTER TABLE "videos_chapters" ADD CONSTRAINT "videos_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "videos_public_files" ADD CONSTRAINT "videos_public_files_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "videos" ADD CONSTRAINT "videos_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "videos_chapters_order_idx" ON "videos_chapters" USING btree ("_order");
  CREATE INDEX "videos_chapters_parent_id_idx" ON "videos_chapters" USING btree ("_parent_id");
  CREATE INDEX "videos_public_files_order_idx" ON "videos_public_files" USING btree ("_order");
  CREATE INDEX "videos_public_files_parent_id_idx" ON "videos_public_files" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "videos_slug_idx" ON "videos" USING btree ("slug");
  CREATE UNIQUE INDEX "videos_youtube_id_idx" ON "videos" USING btree ("youtube_id");
  CREATE INDEX "videos_published_at_idx" ON "videos" USING btree ("published_at");
  CREATE INDEX "videos_hidden_idx" ON "videos" USING btree ("hidden");
  CREATE INDEX "videos_product_idx" ON "videos" USING btree ("product_id");
  CREATE INDEX "videos_updated_at_idx" ON "videos" USING btree ("updated_at");
  CREATE INDEX "videos_created_at_idx" ON "videos" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_videos_fk" FOREIGN KEY ("videos_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_videos_id_idx" ON "payload_locked_documents_rels" USING btree ("videos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "videos_chapters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "videos_public_files" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "videos" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "videos_chapters" CASCADE;
  DROP TABLE "videos_public_files" CASCADE;
  DROP TABLE "videos" CASCADE;
  -- the CASCADE above already dropped the FK, hence IF EXISTS
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_videos_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_videos_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "videos_id";`)
}
