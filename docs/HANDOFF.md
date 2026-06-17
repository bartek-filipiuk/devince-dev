# HANDOFF — devince.dev (stan na 2026-06-11, rano)

> **NOCNY BUILD WYKONANY:** `apps.devince.dev` zbudowane end-to-end, lokalnie zielone, **PR #16 otwarty** (stacked na PR #15 — merguj #15 najpierw, #16 auto-przetarguje się na main). Branch: `feat/apps-subdomain` (20 commitów). Weryfikacja: test:int 57/57, build OK, pełny smoke (zakup→grant→mail-link→download BYTES-OK, izolacja courses/main nietknięta, statyki OK na 3 hostach). 2× security review bez Critical/Important. Szczegóły + runbook deploya: opis PR #16.
> **Uwaga middleware:** nocny fix `d9f9752` przebudował kolejność routingu hostów (tokeny pobrań z kropką wpadały w PUBLIC_FILE regex) — courses/main zweryfikowane, ale przy review #16 spojrzeć na `src/middleware.ts`.
> **Nowe env na prod (apps):** `DOWNLOAD_TOKEN_SECRET`, `NEXT_PUBLIC_APPS_URL`, opc. `BREVO_DOWNLOAD_TEMPLATE_ID`. DNS `apps.devince.dev` do dodania. Volume `private-media-apps/`.
> **Plan na rano (bez zmian):** (1) blocker tsx/runner migracji w kontenerze → (2) deploy courses.* wg runbooku niżej → (3) merge #15 → #16 → deploy apps.*.

> Czytasz to po `/clear`. Cel: wskoczyć od razu i działać, bez rozkminiania „co dalej".

## GDZIE JESTEŚMY TERAZ
- Branch roboczy: **`feat/courses-subdomain`**, **PR #15** otwarty (courses.* + przejście na migracje). **Jeszcze NIE wdrożone na prod.**
- Cały feature `courses.devince.dev` zbudowany i zweryfikowany LOKALNIE (`pnpm test:int` 30/30, `pnpm build` OK, smoke przeszedł). Główna `devince.dev` nietknięta (pełna izolacja).

## NASTĘPNA AKCJA (wybierz jedną — obie zaplanowane z właścicielem)
**A) Deploy courses.\*** — przejść runbook (niżej). **Najpierw zweryfikuj blocker:** runner migracji `scripts/migrate.mjs` używa `tsx` (devDep) — w obrazie standalone może go nie być. Sprawdź/ułóż start kontenera (tsx w obrazie, albo skompiluj runner do czystego JS, albo `pnpm payload migrate`). Potem reconcile + deploy.

**B) Zbuduj `apps.devince.dev` (Projekt 2)** — osobny cykl spec→plan→subagenci (ustalone). Wymagania: sklep z **plikami do pobrania**, **one-time Stripe**, **bez konta** + **podpisany, wygasający link na mail** (Brevo), ten sam wzorzec **subdomena→themed layout** co courses (`(courses)`→tu `(apps)`/`apps-app`), ten sam design (Sylabus-derived). Reużyj: Stripe webhook, Brevo helper, `course-assets` (prywatne uploady/streaming), wzorzec migracji. Zacznij od `superpowers:brainstorming` → spec `docs/superpowers/specs/2026-06-10-apps-subdomain-design.md` → plan → subagent-driven.

## CO ZROBILIŚMY (ta sesja, w skrócie)
1. **Lokalizacja PL/EN** (zmergowane na main, LIVE): `[locale]` routing, słownik UI, localized pola, locale-aware globals, switcher full-nav. Patrz [[devince-course-platform-i18n-state]].
2. **Platforma kursowa** (zmergowane na main, LIVE): Lessons/Users(roles/purchases)/gating/Stripe webhook/Brevo/auth/course-assets. Security-audit zrobiony (1 CRIT + 3 HIGH naprawione).
3. **Incydent prod** (localization schema na `push:true`) — rozwiązany ręcznym SQL; **dlatego przeszliśmy na migracje**.
4. **courses.\*** (ten branch/PR #15) — opis niżej.

## courses.* — co dokładnie jest
- **Faza 0 — migracje Payload:** `payload.config` `push:false` + `migrationDir`; baseline `src/migrations/20260610_193458_init`; runner `scripts/migrate.mjs` (`payload.db.migrate()`); jednorazowy `scripts/reconcile-prod-migrations.ts` (oznacza baseline jako zaaplikowany + addytywnie dosypuje brakujące tabele kursowe; przetestowany na symulacji prod). Migracje pól sylabusa: `…_courses_syllabus_model`, `…_phases_letter_field`.
- **Subdomena+theme:** middleware (`src/middleware.ts`) host-rewrite `courses.*`→realny segment **`src/app/courses-app/`** (własny root layout + `course-theme.css`, izolowane). `/login`/`/account`/`/learn` na courses-host też rewrite do courses-app (lista `COURSE_PAGE_PREFIXES`). `/api`,`/_next` współdzielone (matcher-excluded).
- **Model:** `Program` tab „Sylabus": `phases`(**`letter`**/name/hint — NIE `id`!), `outcomes`, `audience`, `requirements`, `level`. `Lessons`: `nr`,`phaseId`,`hardGate`,`hybrid`,`kind`,`estTimeMin{min,max}`,`why`,`what`,`dod`,`skills`,`dependencies`.
- **Strony** (`src/app/courses-app/`): `page.tsx` storefront (paginacja, `courseMeta` helper), `[slug]/page.tsx` sylabus (data-driven, hero spine + curriculum + badge'e), `[slug]/learn/[lesson]/page.tsx` gated lekcja, `login`/`account` themed.
- **Import:** `scripts/import-course.ts` mapuje `COurses-handoff/courses/project/pipeline.json` → fazy + metadane etapów (realny kurs `od-pomyslu-do-wdrozenia`: 9 faz/23 etapy/5 hard-gate).

## RUNBOOK DEPLOYA courses.* (operator — KRYTYCZNE, inaczej prod 500)
Prod ma schemat „ręcznie połatany", brak ledgera migracji, enum locale = **`enum__locales`** (nie `_locales`), tabele kursowe (`lessons`/`course_assets`/`stripe_events`/`users_roles`) **NIE są na prodzie**.
1. **Backup prod DB** (jest już `/root/devince-backup-*.sql` na serwerze).
2. **Reconcile (raz):** `scripts/reconcile-prod-migrations.ts` przeciw prod-DB.
3. **Coolify start cmd:** migracje PRZED serwerem (`pnpm tsx scripts/migrate.mjs && <start>`) — ⚠️ zweryfikuj tsx w kontenerze.
4. **Deploy** → migrate.mjs aplikuje pending (`courses_syllabus_model`, `phases_letter_field`).
5. Po deployu: import realnego kursu na prod (`import-course.ts`) lub uzupełnij w adminie.
6. DNS `courses.devince.dev` — już dodane.

## PROD INFRA (operator wykonuje komendy prod — mój klucz SSH nie w agencie)
- Coolify na `hetzner-ax41-1` (65.109.60.26). App container `nwgk0s00440skc0kwsskw4w4-*`. DB container **`yk8ckw80gwww4owo0088wswg`**, db `payload`, user `devince`. Deploy auto na push do `main` (GitHub Action → Coolify webhook).
- Komendy prod odpalaj jako `!ssh hetzner-ax41-1 '...'` (sesja użytkownika).

## DEV STATE / GOTCHAS
- **DB używa MIGRACJI** (`push:false`). Dev DB `payload` (docker `devince_db`, postgres/postgres@localhost:5436) jest świeża+zmigrowana+zaimportowana (realny kurs + testowy `kurs-testowy-sylabus`). Scratch: `payload_ref` (pełny schemat), `prod_sim` (symulacja prod).
- **Pola sylabusa NIE są `localized`** (courses PL-only v1).
- Build: pre-existing `postbuild next-sitemap` ENOENT — kończy exit 0, ignoruj.
- Bash gotcha tej sesji: `pkill`/`kill` w komendzie często daje exit 144 (zabija shell) — komendy przed nim się wykonują; unikaj kończenia komendy przez pkill.
- Design handoff (własność użytkownika, do implementacji): `COurses-handoff/courses/project/` — `Sylabus.html`, `Lekcja.html`, `Dashboard.html`(odłożone), `course/course.css`, `pipeline.json`. Odłożone z courses v1: Dashboard (postępy), Explorer, hero wariant B, blok-content EN.

## KLUCZOWE PLIKI
- Specy/plany: `docs/superpowers/specs|plans/2026-06-*`
- Migracje: `src/migrations/`, `scripts/migrate.mjs`, `scripts/reconcile-prod-migrations.ts`
- courses: `src/app/courses-app/**`, `src/middleware.ts`, `src/collections/{Program,Lessons}/index.ts`, `src/utilities/courseMeta.ts`, `scripts/import-course.ts`
- Security audit kursów (wcześniej): `.security-audit/` (gitignored)

---

## /loop NA NOC — autonomiczny build apps.* (design + działanie)
Użytkownik PRE-AUTORYZOWAŁ ten autonomiczny build per decyzje niżej. **Deploy + niepewny punkt (tsx/runner w kontenerze) + cokolwiek na prodzie = NA RANO, NIE w nocy.** Wklej poniższe jako `/loop` (bez interwału → self-paced; agent sam planuje wakeupy i wznawia do ukończenia):

```
Buduj apps.devince.dev (Projekt 2) end-to-end, autonomicznie, LOKALNIE. Wznawiaj od miejsca przerwania: sprawdź `git log`, pliki `docs/superpowers/{specs,plans}/2026-06-10-apps-subdomain-*`, i listę tasków. Najpierw przeczytaj `docs/HANDOFF.md` (wzorzec courses.* = Twój szablon).

Decyzje (PRE-ZATWIERDZONE — NIE pytaj, NIE rób interaktywnego approval):
- Kolekcja `Products` (downloadable): title, slug, opis (richText), cena (`priceCents`+`currency`) lub `stripePriceId`, `downloadFiles` (PRYWATNE — osobna upload-kolekcja jak `course-assets`, NIE w public/), `_status` published, SEO.
- One-time Stripe: Checkout Session (lub Payment Link z `metadata.productId`) → webhook `checkout.session.completed` (verify signature raw body + idempotencja przez `stripe-events`).
- BEZ KONTA. Po zakupie webhook tworzy **podpisany, wygasający grant pobrania** (kolekcja `DownloadGrants`: token=HMAC, productId, email, expiresAt, maxUses, uses) i Brevo wysyła mail z linkiem `apps.devince.dev/download/<token>`. Route `/api/apps/download/[token]` waliduje (podpis+expiry+limit) i STREAMUJE plik z prywatnego storage. Zero publicznych URL-i do plików.
- Subdomena `apps.*` → wzorzec DOKŁADNIE jak courses: middleware host-rewrite `apps.*`→realny segment `src/app/apps-app/` z własnym root layoutem; TEN SAM design (reużyj/zaadaptuj `src/app/courses-app/course-theme.css`). Strony: storefront (lista produktów + paginacja), produkt (opis + „Kup" → Checkout), sukces/„sprawdź mail".
- Schemat WYŁĄCZNIE przez migracje (`push:false` już jest): każda zmiana modelu = `DATABASE_URI=...payload_ref pnpm payload migrate:create <name>` + commit. NIE przywracaj push:true.

Proces (pomiń interaktywne bramki — user pre-autoryzował):
1. Brak spec? → napisz `docs/superpowers/specs/2026-06-10-apps-subdomain-design.md` (wg decyzji + wzorca `2026-06-10-courses-subdomain-design.md`), self-review (placeholdery/spójność).
2. Brak planu? → użyj `superpowers:writing-plans` → `docs/superpowers/plans/2026-06-10-apps-subdomain.md` (bite-sized; TDD dla logiki: token sign/verify, grant-use; build+smoke dla stron/route). Wzoruj na planie courses.
3. `superpowers:subagent-driven-development` — świeży subagent per task, weryfikacja, commit per task. Reużyj: Stripe webhook + Brevo helper + prywatne uploady/streaming (`course-assets`) + wzorzec subdomena+theme z courses.
4. Weryfikacja lokalna każdego taska: `pnpm test:int`, `pnpm build`, smoke na host `apps.devince.dev` (storefront 200, produkt 200, `/api/apps/download/<bad>` → 401/403, ważny token → plik). Zrób fixture produktu (jak `kurs-testowy-sylabus` dla courses) do smoke; dev DB jest na migracjach.
5. Branch `feat/apps-subdomain` od `main`. Po ukończeniu: push + PR z runbookiem deploya (analogicznym do courses — migracje/reconcile). NIE deployuj.

TWARDE GRANICE (NA RANO, NIE w nocy):
- NIE deployuj, NIE pushuj na `main`, NIE ruszaj prod (SSH/Coolify/reconcile/migracje na prodzie).
- NIE weryfikuj/naprawiaj tsx-w-kontenerze (to osobny morning blocker dla courses).
- Bash: NIE kończ komend przez `pkill`/`kill` (exit 144 zabija shell; zostaw dev-server lub zabij osobną komendą).

Gdy apps.* w pełni zbudowane + lokalnie zielone + PR otwarty → ZAKOŃCZ loop (nie planuj kolejnego wakeupu). Jeśli twardy blocker nierozwiązywalny lokalnie → dopisz notatkę do `docs/HANDOFF.md` (sekcja „apps — blocker") i zakończ.
```

**Na rano (operator + ja):** (1) weryfikacja tsx/runner migracji w kontenerze standalone → ewentualnie skompilować runner / `pnpm payload migrate`; (2) deploy courses.* wg runbooku (backup → reconcile-prod → Coolify start cmd → deploy → import); (3) potem deploy apps.* analogicznie.
