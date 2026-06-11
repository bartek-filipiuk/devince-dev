import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "download_grants_stripe_session_id_idx";
  CREATE UNIQUE INDEX "download_grants_stripe_session_id_idx" ON "download_grants" USING btree ("stripe_session_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "download_grants_stripe_session_id_idx";
  CREATE INDEX "download_grants_stripe_session_id_idx" ON "download_grants" USING btree ("stripe_session_id");`)
}
