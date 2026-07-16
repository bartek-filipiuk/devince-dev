import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_features_variant" AS ENUM('cards', 'ledger', 'columns');
  CREATE TYPE "public"."enum__pages_v_blocks_features_variant" AS ENUM('cards', 'ledger', 'columns');
  CREATE TYPE "public"."enum_program_blocks_features_variant" AS ENUM('cards', 'ledger', 'columns');
  CREATE TYPE "public"."enum__program_v_blocks_features_variant" AS ENUM('cards', 'ledger', 'columns');
  ALTER TABLE "pages_blocks_features" ADD COLUMN "variant" "enum_pages_blocks_features_variant" DEFAULT 'cards';
  ALTER TABLE "_pages_v_blocks_features" ADD COLUMN "variant" "enum__pages_v_blocks_features_variant" DEFAULT 'cards';
  ALTER TABLE "program_blocks_features" ADD COLUMN "variant" "enum_program_blocks_features_variant" DEFAULT 'cards';
  ALTER TABLE "_program_v_blocks_features" ADD COLUMN "variant" "enum__program_v_blocks_features_variant" DEFAULT 'cards';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_features" DROP COLUMN "variant";
  ALTER TABLE "_pages_v_blocks_features" DROP COLUMN "variant";
  ALTER TABLE "program_blocks_features" DROP COLUMN "variant";
  ALTER TABLE "_program_v_blocks_features" DROP COLUMN "variant";
  DROP TYPE "public"."enum_pages_blocks_features_variant";
  DROP TYPE "public"."enum__pages_v_blocks_features_variant";
  DROP TYPE "public"."enum_program_blocks_features_variant";
  DROP TYPE "public"."enum__program_v_blocks_features_variant";`)
}
