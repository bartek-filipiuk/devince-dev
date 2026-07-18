# Tryb kohortowy dla courses.devince.dev — design

Data: 2026-07-18 · Status: zaakceptowany (brainstorm z właścicielem)

## Cel

Generyczny silnik kohortowy jako opcja kursu (`deliveryMode: 'cohort'`) w
Payload CMS, wzorowany 1:1 na sprawdzonych mechanikach primal60/Dadmode60
(`/home/bartek/primal60`), ale konfigurowalny per kurs. Primal60 **zostaje**
osobną apką — nie migrujemy danych ani treści; devince zyskuje feature dla
nowych kursów kohortowych.

Decyzje właściciela:
- Zakres: pełny silnik (kohorty + drip + check-iny + pomiary + streak + admin).
- Check-iny/pomiary: **konfigurowalne per kurs** (definicje pól w Programie,
  wartości w JSON).
- Wejście: **Stripe + invite'y** (oba kanały).
- MCP uczestnika: **w v1**.
- Drip: **tylko kohorty** (wspólny zegar od `cohort.startDate`); tryb solo poza
  zakresem.

## Mechanika źródłowa (port z primal60)

- Lekcja dnia N odblokowuje się o `unlockHour` (default 6:00) w strefie
  `timezone` (default `Europe/Warsaw`), w dniu `cohort.startDate + (N-1)`.
- `programDay` = różnica dni kalendarzowych (w TZ programu) między dziś a
  startem, +1. `< 1` → ekran odliczania; `> programLength` → podsumowanie.
- Admin omija cały gating.
- Check-in: jeden na dzień (upsert), okno zapisu **tylko dziś/wczoraj**.
  `minimumDone=true` dziś + odblokowana lekcja → auto-ukończenie lekcji dnia.
  Backfill wczoraj NIE auto-ukańcza; nic nigdy nie od-ukańcza.
- Streak: kolejne dni z `minimumDone` kończące się dziś (jeśli dziś brak wpisu,
  liczymy od wczoraj).
- Ukończenie programu: `minimumDaysTarget` dni z minimum + dowolna liczba
  `extraTargets` postaci "N check-inów, gdzie pole F ∈ {wartości}".
- Pomiary: jeden wiersz na (user, punkt), upsert; punkty i metryki z configu.
- Invite: token UUID, ważny 7 dni, jednorazowy (atomowy warunkowy UPDATE na
  `usedAt`), email konta pochodzi WYŁĄCZNIE z invite'a.
- Klucze API agenta: plaintext pokazany raz, w DB SHA-256 + prefix, max 5
  aktywnych/usera, soft-revoke, rate-limit 60 req/min per klucz.

## A. Model danych

### Program — nowe pola

- `deliveryMode: select ['self-paced' (default) | 'cohort']` (sidebar).
- Grupa `cohortConfig` (condition: `deliveryMode === 'cohort'`):
  - `programLength` (number, wymagane, np. 60),
  - `unlockHour` (number, default 6), `timezone` (text, default
    `Europe/Warsaw`),
  - `minimumLabel` (text, localized — label wbudowanego pola minimum),
  - `checkinFields` (array): `key` (slug, wymagane), `label` (localized),
    `type: select [boolean|number|select|text]`, `min`/`max` (condition:
    number), `options` (array `{value,label}`, condition: select), `section`
    (text — grupowanie w formularzu),
  - `measurementPoints` (array): `key` (np. D0/D30/D60), `label` (localized),
  - `measurementMetrics` (array): `key`, `label` (localized), `unit`,
    `min`/`max`,
  - `completion` (group): `minimumDaysTarget` (number) + `extraTargets`
    (array): `label` (localized), `fieldKey` (musi wskazywać `checkinFields`),
    `matchValues` (lista wartości), `target` (number).

### Nowe kolekcje

Wzorzec dostępu jak `LessonProgress`: CRUD w Payload adminie tylko admin,
uczestnik czyta własne wiersze (`ownOrAdmin`), zapisy uczestnika wyłącznie
przez route'y aplikacji z `overrideAccess` po własnej walidacji.

| Kolekcja | Pola | Constraint (migracja) |
|---|---|---|
| `cohorts` | `program` (rel, required), `name`, `startDate` (date, required) | — |
| `cohort-members` | `user`, `cohort`, `program`, `joinedAt` | unique `[user, program]` |
| `checkins` | `user`, `program`, `date` (YYYY-MM-DD), `programDay` (number), `minimumDone` (checkbox), `note` (textarea), `values` (json) | unique `[user, program, date]` |
| `course-measurements` | `user`, `program`, `point` (text), `values` (json), `recordedAt` | unique `[user, program, point]` |
| `course-invites` | `program`, `cohort`, `email`, `token` (unique, hook generuje UUID), `expiresAt` (+7 dni), `usedAt`, `createdBy` | token unique |
| `agent-api-keys` | `user`, `name`, `keyPrefix` (12 znaków), `keyHash` (unique, SHA-256), `lastUsedAt`, `revokedAt` | keyHash unique |

- `minimumDone` i `note` to wydzielone kolumny (napędzają streak/heatmapę);
  pola skonfigurowane w `checkinFields` lądują w `values` (json) walidowanym
  serwerowo wg configu programu.
- Klucze naturalne egzekwują unikalne indeksy w migracji — nie logika
  aplikacji (upsert idempotentny wobec wyścigu, jak w `LessonProgress`).

### Bez zmian

- `Users` — dostęp do treści nadal przez `purchases`; kohorta = wiersz w
  `cohort-members` (osobny timestamp `joinedAt`, którego dziś w ogóle brakuje).
- `Lessons` — numer dnia = istniejące pole `nr` (1..programLength); fazy =
  istniejące `phases`/`phaseId`. Dadmode'owe `action` mapuje się na istniejące
  `dod`/`what`.

## B. Logika odblokowywania i agregacje

`src/utilities/cohortUnlock.ts` — czysty port `primal60/src/lib/unlock.ts`,
sparametryzowany configiem programu: `unlockAt`, `isUnlocked` (range guard +
admin bypass), `programDay`, `todayInTz`/`yesterdayInTz`, `canWriteCheckin`
(dziś/wczoraj), `unlockLabel` (polskie stringi). Nikt inny nie liczy dat.
TZ-matematyka: jeśli devince ma już date-fns — użyć; w przeciwnym razie
helper na `Intl.DateTimeFormat` (bez nowej zależności poza `mcp-handler`).

`src/utilities/cohortProgress.ts` — port `streak.ts` + `completion.ts` +
`trend.ts` (średnia krocząca 7 dni) z celami z `cohortConfig.completion`
zamiast stałych 48/14.

### Inwariant bezpieczeństwa: treść zablokowanej lekcji nie opuszcza serwera

W devince zalogowany klient może czytać `lessons` przez REST Payloada, więc
samo `enrolledOrAdmin` (constraint `program in purchases`) wypuściłoby treść
zablokowanych lekcji. `enrolledOrAdmin` staje się async: dla programów
kohortowych, na podstawie membershipów usera, constraint rozszerza się o
`nr <= maksymalny odblokowany dzień` w danym programie (OR-owane per program;
programy self-paced bez zmian; admin bez ograniczeń). Gating trzymany na
warstwie access — strony i MCP tylko go powtarzają (defense-in-depth).

## C. Route'y API (courses host)

- `POST /api/courses/checkin` — sesja (userId TYLKO z sesji) → enrollment +
  membership → `canWriteCheckin(date)` → walidacja `values` Zod-em budowanym
  z `checkinFields` → upsert po `[user, program, date]` → gdy `minimumDone`
  && date == dziś && lekcja dnia odblokowana → wpis `LessonProgress`
  (idempotentny) → zwraca streak.
- `POST /api/courses/measurement` — analogicznie; upsert po
  `[user, program, point]`, walidacja metryk wg configu.
- `POST/DELETE /api/courses/agent-keys` — generacja `dvc_` + 40 base62
  (plaintext raz), SHA-256 do DB, limit 5 aktywnych, revoke = `revokedAt`.
- Accept invite (strona `/join/[token]` + akcja): walidacja tokenu
  (not_found/used/expired), email z invite'a, utworzenie usera (customer) z
  hasłem, `addProgramToPurchases` + `cohort-members` (overrideAccess),
  atomowe `usedAt` (`UPDATE … WHERE usedAt IS NULL`), auto-login.
- Invite email: `afterChange` na `course-invites` wysyła link przez
  istniejące `brevo.ts` (ulepszenie względem primal60, gdzie admin kopiował
  URL ręcznie); URL widoczny też w Payload adminie.
- Webhook Stripe (rozszerzenie istniejącego fulfillmentu): po
  `addProgramToPurchases`, gdy program kohortowy → utworzenie
  `cohort-members` z kohortą o najbliższej przyszłej `startDate` (fallback:
  ostatnia); brak kohort → bez membershipu, informacja w mailu sprzedażowym,
  admin przypisuje ręcznie. `charge.refunded` usuwa też membership.

## D. UI (src/app/courses-app/)

- **Player** (`[slug]/learn/[lesson]`): w trybie kohortowym sidebar pokazuje
  kłódki i `unlockLabel`; wejście w zablokowaną lekcję → ekran blokady (bez
  treści). Admin widzi wszystko.
- **`/[slug]/dzisiaj`**: "Dzień N z X" + faza, streak bar, lekcja dnia (albo
  countdown przed startem, albo podsumowanie po programie z celami),
  formularz check-inu generowany z `checkinFields` (sekcje wg `section`),
  `<details>` "Uzupełnij wczorajszy dzień" gdy wczoraj był dniem programu bez
  wpisu.
- **`/[slug]/postepy`**: karta ukończenia (progress bary z
  `completion`), heatmapa `programLength` dni (minimum / wpis bez minimum /
  brak), tabela pomiarów punkty × metryki + formularz, sparkline'y trendów
  7-dniowych dla numerycznych pól check-inu.
- **`/account/agent`**: generowanie/lista/revoke kluczy + gotowe snippety
  Claude Code i Codex z wklejonym URL.
- **Admin roster**: strona admin-only na courses-app — wybór kohorty, lista
  członków ze statusem minimum na dziś (zielony/szary/pusty). CRUD kohort,
  invite'ów i membershipów w Payload adminie.
- Account: kursy kohortowe linkują do `/dzisiaj` zamiast "kontynuuj lekcję".

## E. MCP uczestnika (v1)

Endpoint w głównej apce (potrzebuje per-user kluczy i DB; osobny
`mcp-server/` pozostaje narzędziem twórcy): `POST /api/agent-mcp` przez
`mcp-handler` (nowa zależność). Auth: Bearer → hash lookup w
`agent-api-keys` → user; rate-limit in-memory 60/min per klucz. Narzędzia
(port z primal60, + opcjonalny argument `program` — slug; wymagany, gdy user
ma >1 kurs kohortowy):

| Tool | Zachowanie |
|---|---|
| `get_today` | programDay, faza, streak, dzisiejszy check-in, lekcja (markdown) tylko gdy odblokowana; `unlocks_at`/`starts_at`/`after_program` w pozostałych stanach |
| `save_checkin` | identyczna logika jak route (okno dziś/wczoraj, auto-complete) |
| `complete_lesson` | re-gating `isUnlocked`, idempotentne ukończenie |
| `get_progress` | dni, ukończone lekcje, pomiary, streak, cele ukończenia |
| `save_measurement` | upsert per punkt |

Twarde reguły z primal60: logika narzędzi w jednym module, każda funkcja
przyjmuje usera z klucza jako pierwszy parametr, `userId` NIGDY z argumentów,
argumenty walidowane Zod, gating re-sprawdzany serwerowo.

## F. Migracja, testy, weryfikacja

- **Jedna migracja Payload** (`pnpm payload migrate:create`): nowe tabele,
  pola Programu, unikalne indeksy. `push: false` — bez migracji deploy padnie
  fail-fast.
- **Unit** (kolokowane `*.test.ts`): `cohortUnlock` (port testów primal60 —
  granice 6:00, DST, range guard), streak/completion/trend z configu,
  walidacja `values` wg `checkinFields`, przypisanie kohorty w webhooku.
- **`src/security/`**: treść zablokowanej lekcji nie wychodzi (REST query
  jako enrolled customer + strona), BOLA na checkin/measurement/agent-keys
  (userId z sesji/klucza), jednorazowość invite'a (wyścig), auth MCP (zły/
  revoked klucz → 401), okno zapisu check-inu.
- **Weryfikacja przed "done"**: `pnpm test:int`, `node
  scripts/lint-security.mjs`, `pnpm lint`, `pnpm build` + ręczny przejazd
  flow w przeglądarce (kurs testowy w trybie cohort).

## Poza zakresem v1

Tryb solo (per-user start), re-walidacja starych check-inów po zmianie
configu (zmiana pól działa wprzód), analityka/eksport, maile "nowa lekcja o
6:00", migracja danych/treści z primal60, edycja daty startu kohorty z
ochroną istniejących wpisów (edycja możliwa w Payload adminie — świadomie
bez dodatkowych zabezpieczeń, jak w primal60).
