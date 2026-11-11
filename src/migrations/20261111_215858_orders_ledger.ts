import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_surface" AS ENUM('courses', 'apps', 'ndqs');
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stripe_session_id" varchar NOT NULL,
  	"surface" "enum_orders_surface" NOT NULL,
  	"item" varchar,
  	"title" varchar,
  	"email" varchar NOT NULL,
  	"amount_paid" numeric,
  	"currency" varchar,
  	"refunded_at" timestamp(3) with time zone,
  	"refunded_amount" numeric,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "orders_id" integer;
  CREATE UNIQUE INDEX "orders_stripe_session_id_idx" ON "orders" USING btree ("stripe_session_id");
  CREATE INDEX "orders_email_idx" ON "orders" USING btree ("email");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_orders_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_orders_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "orders_id";
  DROP TABLE "orders" CASCADE;
  DROP TYPE "public"."enum_orders_surface";`)
}
