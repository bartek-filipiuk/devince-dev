import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_download_grants_email_status" AS ENUM('pending', 'sent', 'delivered', 'opened', 'bounced', 'deferred', 'spam', 'failed');
  ALTER TABLE "download_grants" ADD COLUMN "email_status" "enum_download_grants_email_status" DEFAULT 'pending';
  ALTER TABLE "download_grants" ADD COLUMN "email_message_id" varchar;
  ALTER TABLE "download_grants" ADD COLUMN "email_sent_at" timestamp(3) with time zone;
  CREATE INDEX "download_grants_email_message_id_idx" ON "download_grants" USING btree ("email_message_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "download_grants_email_message_id_idx";
  ALTER TABLE "download_grants" DROP COLUMN "email_status";
  ALTER TABLE "download_grants" DROP COLUMN "email_message_id";
  ALTER TABLE "download_grants" DROP COLUMN "email_sent_at";
  DROP TYPE "public"."enum_download_grants_email_status";`)
}
