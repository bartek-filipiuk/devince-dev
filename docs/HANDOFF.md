# HANDOFF — devince.dev (stan na 2026-06-10)

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
