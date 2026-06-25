# Spec — Publiczny auto-changelog (wariant B)

> Status: **zatwierdzony design**, gotowy do planu implementacji (`writing-plans`).
> Data: 2026-06-25. Brainstorming: ta sesja. Źródła backlogu: `docs/ROADMAP.md`, `docs/GROWTH-BACKLOG.md`.

## Cel i decyzje (z brainstormingu)

Publiczny changelog dla platformy apps/courses, żeby użytkownik widział, że soft żyje i jest poważnie utrzymywany — **przy minimalnym wysiłku właściciela**.

Decyzje podjęte z userem (kolejno):
1. **Per-produkt wersjonowany** → zrewidowane na **platform-wide feed**, bo deploy jest platformowy (jedno repo `bartek-filipiuk/devince-dev`, jeden kontener Coolify serwuje apps+courses+main). Jeden deploy = zbiór zmergowanych PR-ów, nie „nowa wersja produktu X".
2. **Trigger + bramka = wariant B**: webhook „Deployment Success" z Coolify → nasz endpoint → **auto-publish z filtrami** (bez bramki draft). User świadomie przyjął ryzyko braku bramki; mitygujemy filtrami + ogólnikowym security + furtką edycji/ukrycia po fakcie.
3. **Treść**: z automatu — PR-y od ostatniego wpisu streszczone przez Claude do krótkich notek „co + dlaczego" (PL/EN), bez szczegółów.

Powierzchnie: `/changelog` na **apps** i **courses** (bliźniak istniejącej `/roadmap`). devince.dev (main) — opcjonalnie później.

## Architektura — wzorowana na istniejącej `Roadmap`

Changelog odwzorowuje wzorzec roadmapy:
- global `roadmap` (`src/Roadmap/config.ts`) → global `changelog`
- `RoadmapView` + `roadmap.css` → `ChangelogView` + `changelog.css`
- strony `apps-app/roadmap` + `courses-app/roadmap` → `apps-app/changelog` + `courses-app/changelog`
- `GET/PATCH /api/external/roadmap` → `GET/PATCH /api/external/changelog`
- migracja `roadmap_global` → migracja `changelog_global` (addytywna, `push:false`)

### 1. Model danych — global `changelog`

`src/Changelog/config.ts` (`GlobalConfig`, `access.read: () => true`):

```
changelog (global)
  entries: array            // najnowsze na górze (renderer sortuje malejąco po date)
    - date:  date (required)          // czas deploya, shared
    - notes: array (required, ≥1)
        - text: text (required, LOCALIZED pl/en)   // jedna notka „co + krótkie dlaczego"
        - tag:  select (required, shared)
                opcje: apps | courses | platform | security
    - toSha: text (admin-only: admin.readOnly, admin.hidden albo grupa)   // HEAD objęty wpisem — idempotencja + audyt
    - prRefs: array of { number: number }  (opcj., audyt)
```

- `text` jest **lokalizowany** (PL/EN) jak `title`/`description` w roadmapie → zapis dwuprzebiegowy (pl → ids → en) z id-matchingiem array rows, dokładnie jak recipe w `api/external/roadmap/route.ts`.
- `tag`/`date`/`toSha` są shared (nielokalizowane).
- `toSha` to wskaźnik „dokąd doszliśmy" — źródło prawdy dla `lastSha` przy następnym uruchomieniu (idempotencja). Trzymany na wpisie, nie globalnie, żeby audyt był per-wpis.

Migracja: nowy global → nowa tabela; addytywna; wygenerowana przez `pnpm payload migrate:create changelog_global`, zweryfikowana że nie ma `NOT NULL` bez defaultu na istniejących tabelach (global jest nowy → bezpieczne).

### 2. Pipeline generacji (czysty rdzeń + cienkie IO)

Trzy czyste, testowalne funkcje + cienki orchestrator:

**a) `selectChangelogPRs(prs)` — `src/utilities/changelogSelect.ts`** (pure)
Wejście: lista `{ number, title, body, labels[], mergedAt }`. Wyjście: przefiltrowana lista.
- Pomija PR-y, których tytuł zaczyna się od conventional-prefiksu `chore|ci|build|test|docs|style|refactor` (+ `bot`/dependabot merge-commits — heurystyka po autorze/labelu).
- Pomija PR, którego tytuł/opis zawiera token `[skip-changelog]`.
- Zostawia `feat|fix|perf|security` (oraz PR-y z labelem user-facing).
- Wykrywa „security" (label `security` lub prefix `security`/`fix(sec)`) i oznacza `isSecurity: true` (do ogólnikowego frazowania w kroku c).

**b) `parseCompare(githubCompareJson)` — `src/utilities/githubCompare.ts`** (pure)
Parsuje odpowiedź GitHub `compare` API do listy PR-ów (numer, tytuł, body, labels). Bo kontener nie ma `.git` — PR-y ciągniemy z GitHub REST, nie z lokalnego gita.

**c) `summarizeChangelog(prs)` — `src/utilities/changelogSummarize.ts`** (IO: Claude)
- Klient: **`@anthropic-ai/sdk`** (nowa zależność — w deps go nie ma), model **`claude-opus-4-8`**.
- Structured outputs: `client.messages.parse({ ..., output_config: { format: zodOutputFormat(NotesSchema) } })`, `max_tokens: 4096` (mały output, bez streamingu).
- `NotesSchema` (Zod): `{ notes: Array<{ tag: 'apps'|'courses'|'platform'|'security', pl: string, en: string }> }`, max 5.
- Prompt: streszcz PR-y (tytuł+opis = „dlaczego") do ≤5 notek, jedna linia każda, „co + krótkie dlaczego", bez żargonu wewnętrznego; **PR-y oznaczone `isSecurity` → notka ogólnikowa** („Bezpieczeństwo: aktualizacje i łatki podatności" / „Security: dependency updates and vulnerability patches") — NIGDY nazwa podatności/wektora/wersji.
- **Fallback**: gdy Claude padnie / zwróci niewalidne (lub `stop_reason: 'refusal'`) → notki z wyczyszczonych tytułów PR (tag z heurystyki ścieżek/labelów), żeby wpis i tak powstał. Każde wywołanie ma obsłużony `refusal` (mało prawdopodobny tu, ale guard zgodnie ze skillem claude-api).

**Orchestrator: `runChangelogGenerate()` — `src/utilities/changelogGenerate.ts`**
1. `lastSha` = `toSha` najnowszego wpisu globala `changelog`. Pierwszy run (brak wpisów): `CHANGELOG_SEED_SHA` z env (zalecane: SHA HEAD w chwili wdrożenia tej funkcji, żeby pierwszy auto-wpis objął tylko nowe PR-y); gdy env nieustawione → ostatnie 10 zmergowanych PR-ów do `main`.
2. GitHub `GET /repos/bartek-filipiuk/devince-dev/compare/{lastSha}...main` (header `Authorization: Bearer GITHUB_TOKEN`) → HEAD sha + commity w zakresie. Numery PR: dla każdego merge-commitu w zakresie `GET /repos/.../commits/{sha}/pulls` (associated PRs), deduplikacja po numerze.
3. `parseCompare` → `selectChangelogPRs` → jeśli pusto **albo** `lastSha == HEAD` → **no-op** (bez pustego wpisu). 
4. `summarizeChangelog` → notki.
5. Zapis wpisu do globala `changelog` (`payload.updateGlobal`, `overrideAccess: true`), dwuprzebiegowo pl/en, `date = new Date()`, `toSha = HEAD`, `prRefs`.
6. Zwraca `{ created: boolean, entryId?, prCount, notes }`.

Idempotencja/współbieżność: przed zapisem ponownie czyta `lastSha`; jeśli HEAD się nie zmienił → no-op (chroni przed podwójnym strzałem webhooka przy jednym deployu).

### 3. Endpoint + trigger

**`POST /api/changelog/generate?secret=<CHANGELOG_WEBHOOK_SECRET>`** — `src/app/(frontend)/api/changelog/generate/route.ts`
- Gate sekretem skopiowany 1:1 z `api/brevo/webhook/route.ts`: `crypto.createHmac` + `timingSafeEqual`, `?secret=` lub header. 401 gdy brak/zły sekret.
- `export const dynamic = 'force-dynamic'`.
- Po authoryzacji wywołuje `runChangelogGenerate()`. Zawsze **200** dla authed (jak Brevo — żeby nie wywołać retry-stormu Coolify). Body Coolify ignorowane (interesuje nas tylko fakt „deploy się udał").
- Zwraca `{ created, entryId?, prCount, notes }`.

**Trigger**: notyfikacja „Deployment Success" z Coolify → ten URL z `?secret=`.
⚠️ **Feasibility do potwierdzenia w planie**: Coolify musi umieć wysłać generyczny webhook na sukces deploya (Notifications). Jeśli nie umie — **fallback bez zmiany designu**: GitHub Action `on: push: branches: [main]` curl-uje ten sam endpoint. Endpoint jest trigger-agnostyczny (każdy, kto zna sekret, może go odpalić: Coolify / GH Action / ręczny `curl`).

### 4. Render / powierzchnie

- **`ChangelogView`** (`src/components/Changelog/ChangelogView.tsx`) + **`changelog.css`** (na zmiennych theme), 1:1 wzorzec `RoadmapView`/`roadmap.css`. Wpisy najnowsze u góry, grupowane po dacie/miesiącu; każda notka z kropką taga + etykietą.
- **Strony**: `src/app/apps-app/changelog/page.tsx` + `src/app/courses-app/changelog/page.tsx`, `force-dynamic`, `payload.findGlobal({ slug: 'changelog', locale, depth: 0 })`.
- **Filtr per-sklep** (w page/serwerowo): apps pokazuje notki z tagiem `platform|apps|security`; courses `platform|courses|security`. (Cross-cutting + security widoczne na obu; apps-only nie zaśmieca courses i odwrotnie.)
- **Link w nav** (Header, PL/EN) jak dla roadmapy.

### 5. i18n

`src/i18n`: klucze `changelog.meta`, `changelog.title`, `changelog.lead`, `changelog.empty` oraz `changelog.tag.apps|courses|platform|security` — PL i EN.

### 6. Edycja/korekta (furtka zamiast bramki draft)

- Panel Payload: właściciel może edytować/usunąć wpis ręcznie.
- **`GET/PATCH /api/external/changelog?locale=pl|en`** (`src/app/(frontend)/api/external/changelog/route.ts`) — wzorzec 1:1 z `api/external/roadmap/route.ts` (Bearer `EXTERNAL_API_TOKEN`, recipe dwuprzebiegowy). Służy do szybkiej korekty literówki / ukrycia brzydkiej notki po auto-publishu.

## Testy (TDD)

- `selectChangelogPRs`: prefiksy skip, `[skip-changelog]`, wykrycie security, zostawia feat/fix/perf — unit.
- `parseCompare`: parsowanie zamockowanej odpowiedzi GitHub compare — unit.
- `summarizeChangelog`: walidacja outputu Claude + **fallback** przy błędzie/`refusal` (mock SDK) — unit.
- `runChangelogGenerate`: **guard pustki** (0 notek → brak wpisu), **idempotencja** (`lastSha == HEAD` → no-op), zapis pl+en — integration (mock GitHub + Claude).
- Endpoint: gate sekretu (401 bez/zły sekret, 200 authed) — jak test Brevo webhooka.

Narzędzia: `pnpm test:int`, `pnpm build`, smoke stron przez Playwright (DevTools MCP niedostępny).

## Akcje właściciela / nowe sekrety w Coolify

- `CHANGELOG_WEBHOOK_SECRET` — gate endpointu; ustawić URL webhooka deploya w Coolify z `?secret=<...>`.
- `GITHUB_TOKEN` — fine-grained PAT, **read-only** `contents` + `pull requests` na repo `devince-dev`.
- `ANTHROPIC_API_KEY` — nowy klient LLM.
- Nowa zależność: `pnpm add @anthropic-ai/sdk` (oraz `zod` jeśli nie ma — zwykle jest przez Payload; zweryfikować w planie).
- Po stronie Coolify: skonfigurować notyfikację/webhook „Deployment Success" → endpoint. (Lub GH Action fallback — patrz §3.)

## Ryzyka świadomie przyjęte (specyfika wariantu B)

- **Brak bramki draft** → brzydka/wrażliwa notka może wyjść publicznie zanim właściciel zauważy. Mitygacje: ogólnikowe security w promptcie + filtry prefiksów + konwencja `[skip-changelog]` + edycja/ukrycie przez panel/`api/external/changelog`.
- **Webhook Coolify** = jedyna niewiadoma feasibility → fallback GH Action (ten sam endpoint).
- **Klient LLM + klucz** = net-new (nie „już wpięte" — grep po `src/` nie znalazł żadnego wywołania LLM; „Claude wpięty" z HANDOFF dotyczy pipeline'u treści przez MCP, nie in-app).

## Polityka boilerplate

Build w **devince first**; backport do `course-platform-starter` później i selektywnie. Nic do paczki teraz.
