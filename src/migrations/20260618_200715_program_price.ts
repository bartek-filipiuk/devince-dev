import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_program_currency" AS ENUM('pln', 'eur', 'usd');
  CREATE TYPE "public"."enum__program_v_version_currency" AS ENUM('pln', 'eur', 'usd');
  ALTER TABLE "program" ADD COLUMN "price_cents" numeric;
  ALTER TABLE "program" ADD COLUMN "currency" "enum_program_currency" DEFAULT 'pln';
  ALTER TABLE "_program_v" ADD COLUMN "version_price_cents" numeric;
  ALTER TABLE "_program_v" ADD COLUMN "version_currency" "enum__program_v_version_currency" DEFAULT 'pln';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "program" DROP COLUMN "price_cents";
  ALTER TABLE "program" DROP COLUMN "currency";
  ALTER TABLE "_program_v" DROP COLUMN "version_price_cents";
  ALTER TABLE "_program_v" DROP COLUMN "version_currency";
  DROP TYPE "public"."enum_program_currency";
  DROP TYPE "public"."enum__program_v_version_currency";`)
}
