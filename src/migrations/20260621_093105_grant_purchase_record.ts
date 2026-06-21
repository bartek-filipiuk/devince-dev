import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "download_grants" ADD COLUMN "tier" varchar;
  ALTER TABLE "download_grants" ADD COLUMN "amount_paid" numeric;
  ALTER TABLE "download_grants" ADD COLUMN "currency" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "download_grants" DROP COLUMN "tier";
  ALTER TABLE "download_grants" DROP COLUMN "amount_paid";
  ALTER TABLE "download_grants" DROP COLUMN "currency";`)
}
