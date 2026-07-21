import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_program_checkout_consent_mode" AS ENUM('digital-content', 'terms-only');
  CREATE TYPE "public"."enum__program_v_version_checkout_consent_mode" AS ENUM('digital-content', 'terms-only');
  ALTER TABLE "program" ADD COLUMN "checkout_consent_mode" "enum_program_checkout_consent_mode" DEFAULT 'digital-content';
  ALTER TABLE "_program_v" ADD COLUMN "version_checkout_consent_mode" "enum__program_v_version_checkout_consent_mode" DEFAULT 'digital-content';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "program" DROP COLUMN "checkout_consent_mode";
  ALTER TABLE "_program_v" DROP COLUMN "version_checkout_consent_mode";
  DROP TYPE "public"."enum_program_checkout_consent_mode";
  DROP TYPE "public"."enum__program_v_version_checkout_consent_mode";`)
}
