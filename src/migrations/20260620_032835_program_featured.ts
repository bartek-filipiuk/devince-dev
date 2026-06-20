import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "program" ADD COLUMN "featured" boolean DEFAULT false;
  ALTER TABLE "_program_v" ADD COLUMN "version_featured" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "program" DROP COLUMN "featured";
  ALTER TABLE "_program_v" DROP COLUMN "version_featured";`)
}
