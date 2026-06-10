# Spec: `courses.devince.dev` — storefront kursów + design Sylabus (data-driven)

> Status: zatwierdzony design (2026-06-10). Brainstorm + handoff designu `COurses-handoff/` (Claude Design).
> Pierwszy z pary: **Projekt 1 (courses.\*)** teraz, **Projekt 2 (apps.\*)** osobnym spec później. Fundament migracji (Faza 0) jest wspólny dla obu.

## 1. Cel
Wydzielić płatne kursy na dedykowaną subdomenę `courses.devince.dev` z **własnym wyglądem** (design z `COurses-handoff/courses/project/Sylabus.html` + `course/course.css`), nie ruszając reszty `devince.dev`:
- **storefront**: lista wszystkich płatnych kursów z paginacją + linki,
- **strona kursu = sylabus** sterowany danymi (fazy → etapy, hard-gate'y), wg `Sylabus.html`,
- **lekcje gated** wg `Lekcja.html`,
- całość w themie Sylabus (dark-first + light toggle).

## 2. Decyzje (z brainstormu)
| Decyzja | Wybór |
|---|---|
| Sylabus | **Data-driven template** — renderowany z danych KAŻDEGO kursu (Program + Lessons) |
| Strategia schematu DB | **Przejście na migracje Payload** (Faza 0) — koniec outage'ów na deployu |
| Kolejność | courses.\* teraz, apps.\* potem |
| Theme | dark-first + toggle light (jak w `course.css`), scope **tylko** courses.\* |
| Dashboard (postępy) / Explorer | Odłożone (poza zakresem v1) |
| Storefront | Nowy (brak w handoffie) — projektowany w języku Sylabus |

## 3. Stan obecny (zweryfikowany)
- **Program** (`src/collections/Program/index.ts`): `type` course|workshop|event, tab Hero/Szczegóły(`pricing free|paid`, `stripePaymentLink`, `stripePriceId`, `format`, `duration` localized, `ctaLabel/ctaUrl`)/Treść(layout blocks)/SEO. Localized: title, heroHeadline, heroDescription, duration, ctaLabel, locationName/Address.
- **Lessons** (`src/collections/Lessons/index.ts`): `title`, `program` (rel), `phase` (text), `order` (number), `type` (text|embed|video|download), `content` (richText), `youtubeEmbedUrl`, `downloadFile` (→course-assets), `slug`, `publishedAt`. read=`enrolledOrAdmin`.
- **Auth/gating/Stripe/Brevo**: wszystko istnieje (Users roles/purchases, login/set-password/forgot/account w `(frontend)`, `enrolledOrAdmin`, Stripe webhook `api/stripe/webhook`, Brevo helper, `course-assets` prywatne uploady, gated download route).
- **Middleware** (`src/middleware.ts`): rewrite `[locale]` + `EXCLUDED_PREFIXES` (m.in. `/learn`,`/login`,`/account`). **Brak host-aware routingu pod theming.**
- **`payload.config.ts`**: `db push: true`, brak skonfigurowanych migracji (jest tylko stary snapshot `src/migrations/20251207_174832.json`). Prod: standalone `node .next/standalone/server.js`, schemat ręcznie połatany (tabele `_locales` dodane SQL-em; **kursowe tabele `lessons`/`course_assets`/`stripe_events`/`users_roles` NIE są na prodzie**).
- **Design**: `COurses-handoff/courses/project/` — `Sylabus.html`, `course/course.css` (tokeny OKLCH, dark+light), `course/ui.js` (helpery DOM), `Lekcja.html`, `Dashboard.html`, `pipeline.json`/`pipeline-data.js` (struktura faz/etapów). Akcenty: accent niebieski, `gate` bursztyn, `hybrid` teal, `decision` fiolet; mono do liczb; kropkowana siatka tła.

---

## 4. FAZA 0 — Fundament migracji (prerekwizyt, wspólny dla courses.* i apps.*)
Cel: deterministyczne, nieinteraktywne migracje na prod → koniec outage'ów przy zmianie schematu.

1. **`payload.config.ts`**: `push: false`; ustaw `migrationDir` (domyślnie `src/migrations`). Usuń/zarchiwizuj stary, niespójny snapshot `20251207_174832.json` (referuje nieistniejące `courses`/`workshops`).
2. **Baseline migracja (`0001_init`)**: wygenerowana ze **świeżej pustej bazy** (`payload migrate:create` przeciw `payload_ref` z pełnym schematem main) — pełny `up()` tworzący cały aktualny schemat. To kanon.
3. **Reconcile prod (jednorazowo):** skrypt `scripts/reconcile-prod-migrations.ts`, który na prod-DB:
   - tworzy tabelę `payload_migrations` jeśli brak,
   - wstawia wpis baseline jako „już zaaplikowany" (bo prod ma większość schematu),
   - **dosypuje brakujące tabele kursowe** (`lessons`, `_lessons_v*`, `course_assets`, `stripe_events`, `users_roles`, relacje purchases) z DDL wyciągniętego z `payload_ref` (addytywnie, jak fix `_locales`), i zapisuje je jako zaaplikowaną migrację catch-up.
   - **Uwaga enum:** prod używa `enum__locales` (nie `_locales`) — DDL z `payload_ref` ma `_locales`; reconcile musi mapować nazwę enuma jak w hotfiksie produkcyjnym.
4. **Runner przy starcie:** `scripts/migrate.mjs` woła programmatic migrate (`payload.init` + `payload.db.migrate()` lub `await payload.migrate()`), bundlowany do obrazu standalone. **Komenda startu kontenera** (Coolify/Dockerfile): `node scripts/migrate.mjs && node .next/standalone/server.js`. Migracje idą przed startem serwera, nieinteraktywnie.
5. **Od teraz**: każda zmiana schematu = `payload migrate:create` + commit pliku; deploy aplikuje ją sam.

**Definicja ukończenia Fazy 0:** świeży deploy na prod tworzy brakujące tabele kursowe + uruchamia się bez 500; `payload_migrations` spójne; kolejna sztuczna migracja aplikuje się na boot.

---

## 5. Architektura — subdomena → themed layout
Nowa grupa tras **`src/app/(courses)/`** z własnym root layoutem (importuje skonwertowany `course.css`), izolowana od `(frontend)`.

- **Middleware** (`src/middleware.ts`): na początku wykryj `host`. Jeśli `host` zaczyna się od `courses.` → `NextResponse.rewrite` ścieżki do prefiksu grupy `(courses)` (np. `/_courses${pathname}`), z pominięciem rewrite `[locale]` (courses.* = **PL-only v1**, locale-neutral). `/api/*` zostają wspólne (webhook Stripe itd.).
- `(courses)` ma własny `layout.tsx`: `<html class="dark">`, `course.css`, nav storefrontu (brand „Devince · kursy", link do wszystkich kursów, login/konto, theme toggle), footer w stylu Sylabus.
- Reszta `devince.dev` (host bez `courses.`) → bez zmian, `(frontend)`.
- Trasy gated (`/<slug>/learn/...`, `/login`, `/account`) działają pod courses.* w tym themie.

## 6. Design system — integracja `course.css`
- Skopiuj/zaadaptuj `course/course.css` → `src/app/(courses)/course-theme.css` (tokeny OKLCH, dark+light, komponenty: nav, btn, badge, eyebrow, section-title, `.pl`, foot, ph-video). Zero CDN; fonty system+mono jak w oryginale.
- Helpery `course/ui.js` (DOM-buildery) **nie** są przenoszone 1:1 — renderujemy w React (server/client komponenty), odtwarzając wizualnie. Theme toggle: mały client component (localStorage `course:theme`, klasa `light` na `<html>`), bez FOUC (inline script jak `InitTheme`).
- **Scope:** te style ładuje wyłącznie layout `(courses)` → nie wpływają na `(frontend)`.

## 7. Model danych (data-driven sylabus)
Rozszerzenia (lokalizacja: courses v1 PL-only → bez `localized` na nowych polach):

**Program** — nowy tab „Sylabus / Kurs":
- `phases` (array): `id` (text, np. „A"), `name` (text), `hint` (textarea). Kolejność = porządek faz.
- `outcomes` (array): `title`, `body` — sekcja „Czego się nauczysz".
- `audience` (array of text) + `requirements` (array of text) — infocards „Dla kogo" / „Czego potrzebujesz".
- `level` (select: beginner/intermediate/advanced) — opcjonalne, do meta.

**Lessons** — nowe pola (do sylabusa + strony lekcji wg `pipeline.json`):
- `nr` (number) — numer etapu (do sortowania i wyświetlania `01..23`).
- `phaseId` (text) — id fazy (spina etap z fazą w Program.phases).
- `hardGate` (checkbox) — flaga „hard-gate" (ikona kłódki + badge bursztynowy). Wiernie wg `pipeline.json.hard_gate`.
- `hybrid` (checkbox) — etap hybrydowy/IRL (badge teal „hybrid · IRL"). Wg `pipeline.json.hybrid`.
- `kind` (select: `normal` | `decision`) — typ etapu; `decision` → badge fioletowy. Wg `pipeline.json.type`.
  (Trzy niezależne sygnały = trzy badge'e, dokładnie jak w designie i danych.)
- `estTimeMin` (group): `min` (number), `max` (number) — „X–Y min".
- Rich content lekcji (wg `Lekcja.html`): `why` (textarea/richText), `what` (textarea/richText), `dod` (textarea — Definition of Done), `skills` (array of text), `dependencies` (relationship → lessons, hasMany — `required_predecessors`).
- (zostają: `title`/`nazwa`, `slug`, `content`, `youtubeEmbedUrl`, `downloadFile`, `program`, `order`, `publishedAt`.)

`pnpm generate:types` po zmianach. Te zmiany schematu idą przez migrację (Faza 0).

**Import danych istniejącego kursu:** rozszerzyć `scripts/import-course.ts`, by mapował `pipeline.json` (faza→etapy, metadane) na `Program.phases` + pola `Lessons`. Idempotentnie.

## 8. Strony pod `(courses)`
1. **`/` — storefront** (`(courses)/page.tsx`, force-dynamic): `payload.find` Program `where { type: course, pricing: paid, _status: published }`, paginacja (`limit`, `?page=`). Karty w stylu Sylabus (`.oc`/card: tytuł, eyebrow, krótki opis, meta liczbowe — liczba faz/etapów/szac. czas z lekcji, cena). Karta linkuje do `/<slug>`. Stan pusty + komponent paginacji (mono, w themie).
2. **`/<course-slug>` — sylabus** (`(courses)/[slug]/page.tsx`, force-dynamic): odwzorowanie `Sylabus.html` data-driven:
   - hero: **domyślnie wariant A „spine"** (editorial split z kartą faz). Wariant B („rail") i przełącznik A/B = **opcjonalne, poza v1** (implementujemy tylko A). `meta` liczbowe (9 faz / 23 etapy / szac. czas / liczba hard-gate — liczone z danych), CTA „Zacznij" → pierwsza lekcja gated.
   - outcomes (z `Program.outcomes`), curriculum (Program.phases → Lessons po `phaseId`/`nr`, badge'e z `hardGate`/`hybrid`/`kind`, czas z `estTimeMin`, link do lekcji), infocards (audience/requirements), cta-band.
   - SEO: `generateMeta` w themie courses.
3. **`/<course-slug>/learn/<lesson-slug>` — lekcja** (gated, `enrolledOrAdmin`): odwzorowanie `Lekcja.html` (lhead/badges, lvideo z `youtubeEmbedUrl`, sekcje why/what/dod, deplist z `dependencies`, pager prev/next po `nr`, sidebar z listą etapów fazy). SSR guard jak istniejące `/learn` (sesja + purchase).
4. **`/login`, `/account`** w themie `(courses)` (reużyć logikę z `(frontend)`, przestylować do course-theme).

## 9. Obsługa błędów / edge
- Kurs bez lekcji/faz → sylabus renderuje hero + outcomes, sekcja curriculum pokazuje stan „wkrótce".
- Nieistniejący slug → 404 w themie courses.
- Theme toggle bez FOUC (inline init przed paintem).
- Storefront: `pricing != paid` lub draft → nie listowane.
- Gating bez zmian (SSR redirect do `/login?next=` jak dziś).

## 10. Poza zakresem (v1)
- `Dashboard.html` (postępy ucznia), `Explorer` (interaktywna mapa) — osobny, późniejszy krok.
- Wielojęzyczność courses.* (PL-only v1).
- apps.* — osobny spec (`2026-06-10-apps-subdomain-design.md`, po courses.*).
- Workshops/events na subdomenie (zostają na devince.dev).

## 11. Testowanie
- vitest: helpery (liczenie meta z lekcji: faz/etapów/czasu/hard-gate; mapowanie pipeline→model w imporcie).
- Build/lint + Playwright smoke: `courses.devince.dev/` (storefront, paginacja), `/<slug>` (sylabus renderuje fazy/etapy), `/<slug>/learn/<lesson>` (gated → redirect bez sesji), theme toggle, izolacja stylów (główna devince.dev bez zmian wyglądu).
- **Faza 0**: na stagingu/świeżej bazie potwierdzić, że migracje tworzą pełny schemat; reconcile-prod przetestować na kopii prod-dumpa (mamy backup `/root/devince-backup-*.sql`).

## 12. Workstreamy i zależności
- **F0 — Migracje** (prerekwizyt wszystkiego): push:false + baseline + reconcile-prod + runner startowy. Najpierw.
- **C1 — Subdomena+theme**: middleware host-rewrite, grupa `(courses)` + layout + `course-theme.css` + theme toggle.
- **C2 — Model danych**: pola Program(phases/outcomes/audience/requirements) + Lessons(nr/phaseId/hardGate/hybrid/kind/estTimeMin/why/what/dod/skills/deps) → migracja → generate:types. (zależy F0)
- **C3 — Storefront**: lista + paginacja (zależy C1).
- **C4 — Sylabus page**: data-driven `Sylabus.html` (zależy C1+C2).
- **C5 — Lekcja page**: `Lekcja.html` gated (zależy C1+C2).
- **C6 — Auth w themie** + import danych (`pipeline.json`→model). (zależy C2)
- Kolejność: F0 → C1/C2 → C3/C4/C5/C6.

**Reużycie w apps.\*:** wzorzec subdomena→themed-layout (C1), Stripe webhook, Brevo, secure-download, migracje (F0).
