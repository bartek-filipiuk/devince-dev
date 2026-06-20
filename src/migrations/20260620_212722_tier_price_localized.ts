import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Localizes the pricing-tier `priceCents` + `currency` so PL and EN can be
 * priced fully independently (e.g. PL in PLN, EN in USD, unrelated amounts).
 * `name` + `recommended` stay shared; `tagline` + `features` were already
 * localized.
 *
 * Hand-written to be PROD-SAFE + data-preserving. The Payload-generated default
 * adds the new locale columns then DROPs the originals WITHOUT copying the
 * existing prices — which would null out every live tier price (product 4 has
 * real prices) and break the page + checkout. Here the existing shared values
 * are copied into BOTH locale rows first, then the source columns are dropped.
 * The `products_tiers_locales` rows already exist for pl + en (tagline was
 * localized earlier), so the UPDATE populates both languages with the current
 * value; per-locale overrides are then applied via the content API.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "products_tiers_locales" ADD COLUMN "price_cents" numeric;
  ALTER TABLE "products_tiers_locales" ADD COLUMN "currency" "enum_products_tiers_currency" DEFAULT 'usd';
  ALTER TABLE "_products_v_version_tiers_locales" ADD COLUMN "price_cents" numeric;
  ALTER TABLE "_products_v_version_tiers_locales" ADD COLUMN "currency" "enum__products_v_version_tiers_currency" DEFAULT 'usd';

  -- Copy the existing (shared) price + currency into the locale rows before
  -- dropping the source columns, so no live tier price is lost. INSERT ... ON
  -- CONFLICT (not a bare UPDATE): a tier may have a locale row for only one
  -- language (e.g. EN tagline never set), and a plain UPDATE would leave the
  -- other locale's price_cents NULL — under fallback:true an EN buyer would
  -- then be charged the PL price. Materialise BOTH locales for every tier so
  -- each (tier, locale) carries the price explicitly.
  INSERT INTO "products_tiers_locales" ("_parent_id", "_locale", "price_cents", "currency")
    SELECT t."id", loc.code, t."price_cents", t."currency"
    FROM "products_tiers" t
    CROSS JOIN (VALUES ('pl'::"_locales"), ('en'::"_locales")) AS loc(code)
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE
    SET "price_cents" = EXCLUDED."price_cents", "currency" = EXCLUDED."currency";
  INSERT INTO "_products_v_version_tiers_locales" ("_parent_id", "_locale", "price_cents", "currency")
    SELECT t."id", loc.code, t."price_cents", t."currency"
    FROM "_products_v_version_tiers" t
    CROSS JOIN (VALUES ('pl'::"_locales"), ('en'::"_locales")) AS loc(code)
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE
    SET "price_cents" = EXCLUDED."price_cents", "currency" = EXCLUDED."currency";

  ALTER TABLE "products_tiers" DROP COLUMN "price_cents";
  ALTER TABLE "products_tiers" DROP COLUMN "currency";
  ALTER TABLE "_products_v_version_tiers" DROP COLUMN "price_cents";
  ALTER TABLE "_products_v_version_tiers" DROP COLUMN "currency";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_tiers" ADD COLUMN "price_cents" numeric;
  ALTER TABLE "products_tiers" ADD COLUMN "currency" "enum_products_tiers_currency" DEFAULT 'usd';
  ALTER TABLE "_products_v_version_tiers" ADD COLUMN "price_cents" numeric;
  ALTER TABLE "_products_v_version_tiers" ADD COLUMN "currency" "enum__products_v_version_tiers_currency" DEFAULT 'usd';

  -- Restore the (now single) price from the default-locale row onto the array.
  UPDATE "products_tiers" t
    SET "price_cents" = l."price_cents", "currency" = l."currency"
    FROM "products_tiers_locales" l WHERE l."_parent_id" = t."id" AND l."_locale" = 'pl'::"_locales";
  UPDATE "_products_v_version_tiers" t
    SET "price_cents" = l."price_cents", "currency" = l."currency"
    FROM "_products_v_version_tiers_locales" l WHERE l."_parent_id" = t."id" AND l."_locale" = 'pl'::"_locales";

  ALTER TABLE "products_tiers_locales" DROP COLUMN "price_cents";
  ALTER TABLE "products_tiers_locales" DROP COLUMN "currency";
  ALTER TABLE "_products_v_version_tiers_locales" DROP COLUMN "price_cents";
  ALTER TABLE "_products_v_version_tiers_locales" DROP COLUMN "currency";`)
}
