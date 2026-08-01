import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Naprawa rozjazdu schematu po commicie acd3383 ("i18n: localize Posts.content +
 * Header/Footer nav labels"), który zmienił konfigurację pól na `localized: true`
 * bez wygenerowania migracji. Produkcyjna baza powstała przed migracją init
 * (20260610_193458), więc kolumny lokalizowane nigdy do niej nie trafiły.
 *
 * Objaw: każde utworzenie posta kończyło się błędem
 * `column "version_content" of relation "_posts_v_locales" does not exist` (42703),
 * bo Payload zapisuje wersję przed rekordem. Wykryte 2026-08-01, ostatni post
 * powstał 2026-05-14 — luka nie ujawniła się przez ~7 tygodni.
 *
 * Migracja jest idempotentna: każdy krok sprawdza istnienie tabeli i kolumny,
 * więc bezpiecznie przechodzi zarówno na bazie z brakami, jak i na już poprawnej
 * (np. lokalnej odtworzonej z migracji).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      -- Kolumny lokalizowane oczekiwane przez schemat (snapshot 20260721_200312).
      IF to_regclass('public.posts_locales') IS NOT NULL THEN
        ALTER TABLE "posts_locales" ADD COLUMN IF NOT EXISTS "content" jsonb;
      END IF;

      IF to_regclass('public._posts_v_locales') IS NOT NULL THEN
        ALTER TABLE "_posts_v_locales" ADD COLUMN IF NOT EXISTS "version_content" jsonb;
      END IF;

      IF to_regclass('public.header_nav_items_locales') IS NOT NULL THEN
        ALTER TABLE "header_nav_items_locales" ADD COLUMN IF NOT EXISTS "link_label" varchar;
      END IF;

      IF to_regclass('public.footer_nav_items_locales') IS NOT NULL THEN
        ALTER TABLE "footer_nav_items_locales" ADD COLUMN IF NOT EXISTS "link_label" varchar;
      END IF;
    END $$;
  `)

  // Przeniesienie treści sprzed lokalizacji: przed acd3383 treść siedziała
  // w nielokalizowanych tabelach. Kopiujemy do locale 'pl' (wcześniej istniał
  // tylko jeden język) wyłącznie tam, gdzie docelowa kolumna jest pusta —
  // dzięki temu ponowne uruchomienie niczego nie nadpisze.
  await db.execute(sql`
    DO $$
    BEGIN
      IF to_regclass('public._posts_v_locales') IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = '_posts_v'
             AND column_name = 'version_content'
         )
      THEN
        UPDATE "_posts_v_locales" loc
        SET "version_content" = v."version_content"
        FROM "_posts_v" v
        WHERE loc."_parent_id" = v."id"
          AND loc."_locale" = 'pl'
          AND loc."version_content" IS NULL
          AND v."version_content" IS NOT NULL;
      END IF;

      IF to_regclass('public.posts_locales') IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'posts'
             AND column_name = 'content'
         )
      THEN
        UPDATE "posts_locales" loc
        SET "content" = p."content"
        FROM "posts" p
        WHERE loc."_parent_id" = p."id"
          AND loc."_locale" = 'pl'
          AND loc."content" IS NULL
          AND p."content" IS NOT NULL;
      END IF;
    END $$;
  `)
}

/**
 * Celowo bez rollbacku. Zdjęcie tych kolumn przywróciłoby awarię zapisu postów
 * i skasowało treść zapisaną po naprawie. Jeżeli trzeba cofnąć ten stan,
 * zrób to ręcznie, świadomie i z backupem.
 */
export async function down({ payload }: MigrateDownArgs): Promise<void> {
  payload.logger.warn(
    'Migracja 20260801_004500_repair_localized_columns nie ma rollbacku — ' +
      'usunięcie kolumn ponownie zepsułoby tworzenie postów.',
  )
}
