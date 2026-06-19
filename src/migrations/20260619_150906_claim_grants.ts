import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_program_access_mode" AS ENUM('paid', 'lead-magnet');
  CREATE TYPE "public"."enum__program_v_version_access_mode" AS ENUM('paid', 'lead-magnet');
  CREATE TYPE "public"."enum_products_access_mode" AS ENUM('paid', 'lead-magnet');
  CREATE TYPE "public"."enum__products_v_version_access_mode" AS ENUM('paid', 'lead-magnet');
  CREATE TYPE "public"."enum_claim_grants_kind" AS ENUM('app', 'course');
  CREATE TABLE "claim_grants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"token" varchar NOT NULL,
  	"kind" "enum_claim_grants_kind" NOT NULL,
  	"item_id" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"claimed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "program" ADD COLUMN "access_mode" "enum_program_access_mode" DEFAULT 'paid';
  ALTER TABLE "_program_v" ADD COLUMN "version_access_mode" "enum__program_v_version_access_mode" DEFAULT 'paid';
  ALTER TABLE "products" ADD COLUMN "access_mode" "enum_products_access_mode" DEFAULT 'paid';
  ALTER TABLE "_products_v" ADD COLUMN "version_access_mode" "enum__products_v_version_access_mode" DEFAULT 'paid';
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "claim_grants_id" integer;
  CREATE UNIQUE INDEX "claim_grants_token_idx" ON "claim_grants" USING btree ("token");
  CREATE INDEX "claim_grants_email_idx" ON "claim_grants" USING btree ("email");
  CREATE INDEX "claim_grants_updated_at_idx" ON "claim_grants" USING btree ("updated_at");
  CREATE INDEX "claim_grants_created_at_idx" ON "claim_grants" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_claim_grants_fk" FOREIGN KEY ("claim_grants_id") REFERENCES "public"."claim_grants"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_claim_grants_id_idx" ON "payload_locked_documents_rels" USING btree ("claim_grants_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "claim_grants" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "claim_grants" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_claim_grants_fk";
  
  DROP INDEX "payload_locked_documents_rels_claim_grants_id_idx";
  ALTER TABLE "program" DROP COLUMN "access_mode";
  ALTER TABLE "_program_v" DROP COLUMN "version_access_mode";
  ALTER TABLE "products" DROP COLUMN "access_mode";
  ALTER TABLE "_products_v" DROP COLUMN "version_access_mode";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "claim_grants_id";
  DROP TYPE "public"."enum_program_access_mode";
  DROP TYPE "public"."enum__program_v_version_access_mode";
  DROP TYPE "public"."enum_products_access_mode";
  DROP TYPE "public"."enum__products_v_version_access_mode";
  DROP TYPE "public"."enum_claim_grants_kind";`)
}
