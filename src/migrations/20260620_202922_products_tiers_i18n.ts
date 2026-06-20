import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Localizes the pricing-tier text fields (`tiers.tagline` + the `tiers.features`
 * array) so PL and EN can show fully translated tier copy. Price, currency,
 * `recommended` and tier `name` stay NON-localized (shared across locales) — the
 * checkout price must never differ by display language.
 *
 * Hand-written to be PROD-SAFE on populated tables. The Payload-generated
 * default does `ADD COLUMN "_locale" ... NOT NULL` with no default, which FAILS
 * on the existing `products_tiers_features` rows (product 4 already has tiers).
 * Here every new `_locale` column is added nullable, backfilled to the default
 * locale ('pl'), then constrained NOT NULL; the existing `tagline` values are
 * copied into the new locale table BEFORE the old columns are dropped, so no
 * tier data is lost during the deploy.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE "products_tiers_locales" (
  	"tagline" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );

  CREATE TABLE "_products_v_version_tiers_locales" (
  	"tagline" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );

  ALTER TABLE "products_tiers_locales" ADD CONSTRAINT "products_tiers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_tiers_locales" ADD CONSTRAINT "_products_v_version_tiers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_version_tiers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "products_tiers_locales_locale_parent_id_unique" ON "products_tiers_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_products_v_version_tiers_locales_locale_parent_id_unique" ON "_products_v_version_tiers_locales" USING btree ("_locale","_parent_id");

  -- Move existing (non-localized) tagline values into the default locale before
  -- dropping the old columns. One locale row per existing tier row.
  INSERT INTO "products_tiers_locales" ("tagline", "_locale", "_parent_id")
  	SELECT "tagline", 'pl'::"_locales", "id" FROM "products_tiers";
  INSERT INTO "_products_v_version_tiers_locales" ("tagline", "_locale", "_parent_id")
  	SELECT "tagline", 'pl'::"_locales", "id" FROM "_products_v_version_tiers";

  ALTER TABLE "products_tiers" DROP COLUMN "tagline";
  ALTER TABLE "_products_v_version_tiers" DROP COLUMN "tagline";

  -- features._locale: add nullable, backfill to default locale, then enforce.
  ALTER TABLE "products_tiers_features" ADD COLUMN "_locale" "_locales";
  UPDATE "products_tiers_features" SET "_locale" = 'pl'::"_locales" WHERE "_locale" IS NULL;
  ALTER TABLE "products_tiers_features" ALTER COLUMN "_locale" SET NOT NULL;

  ALTER TABLE "_products_v_version_tiers_features" ADD COLUMN "_locale" "_locales";
  UPDATE "_products_v_version_tiers_features" SET "_locale" = 'pl'::"_locales" WHERE "_locale" IS NULL;
  ALTER TABLE "_products_v_version_tiers_features" ALTER COLUMN "_locale" SET NOT NULL;

  CREATE INDEX "products_tiers_features_locale_idx" ON "products_tiers_features" USING btree ("_locale");
  CREATE INDEX "_products_v_version_tiers_features_locale_idx" ON "_products_v_version_tiers_features" USING btree ("_locale");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_tiers" ADD COLUMN "tagline" varchar;
  ALTER TABLE "_products_v_version_tiers" ADD COLUMN "tagline" varchar;

  -- Restore the default-locale tagline back onto the array rows.
  UPDATE "products_tiers" t SET "tagline" = l."tagline"
  	FROM "products_tiers_locales" l WHERE l."_parent_id" = t."id" AND l."_locale" = 'pl'::"_locales";
  UPDATE "_products_v_version_tiers" t SET "tagline" = l."tagline"
  	FROM "_products_v_version_tiers_locales" l WHERE l."_parent_id" = t."id" AND l."_locale" = 'pl'::"_locales";

  ALTER TABLE "products_tiers_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_products_v_version_tiers_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "products_tiers_locales" CASCADE;
  DROP TABLE "_products_v_version_tiers_locales" CASCADE;
  DROP INDEX "products_tiers_features_locale_idx";
  DROP INDEX "_products_v_version_tiers_features_locale_idx";
  ALTER TABLE "products_tiers_features" DROP COLUMN "_locale";
  ALTER TABLE "_products_v_version_tiers_features" DROP COLUMN "_locale";`)
}
