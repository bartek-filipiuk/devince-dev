import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Reconcile a production-only schema drift: the Program versions table
 * (`_program_v`) was missing the Stripe columns that exist on the main
 * `program` table (and on dev). Any draft/update operation on a Program read
 * the versions table and failed with
 * `column "_program_v.version_stripe_payment_link" does not exist`, which broke
 * creating/publishing/updating a course via the external API.
 *
 * `ADD COLUMN IF NOT EXISTS` makes this a safe no-op where the columns already
 * exist (dev), and adds them where they're missing (prod). Down is intentionally
 * a no-op — these columns are part of the canonical schema; dropping them would
 * re-introduce the drift.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "_program_v" ADD COLUMN IF NOT EXISTS "version_stripe_payment_link" varchar;`)
  await db.execute(sql`ALTER TABLE "_program_v" ADD COLUMN IF NOT EXISTS "version_stripe_price_id" varchar;`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // No-op: these columns belong to the canonical schema (present on dev + the
  // main `program` table). Dropping them would re-create the drift this fixes.
}
