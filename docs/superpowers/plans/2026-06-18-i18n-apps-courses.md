# i18n PL/EN dla apps + courses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `apps.devince.dev` and `courses.devince.dev` fully bilingual (PL/EN) — English UI + localized content — reusing the existing i18n infra, with ZERO Polish regression on the live stores.

**Architecture:** Middleware sets an `x-locale` header per host (`/en/` prefix → en, prefix-less → pl, `/pl/` → redirect canonical) and rewrites to `/apps-app` / `/courses-app` as today — NO route-segment restructure. Pages/layouts read locale via `getLocale()`, render UI via `t(locale, key)`, build links via `getLocalizedPath()`, and fetch localized content via `payload.find/findByID({ locale })`. Selected content fields become `localized: true` via one migration that preserves existing values as the `pl` locale.

**Tech Stack:** Next.js 15 App Router (middleware, server components), Payload 3.67 (localized fields, migrations), Postgres, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-18-i18n-apps-courses-design.md`

## Global Constraints
- Default locale `pl`; **PL URLs stay prefix-less and unchanged** (zero regression).
- Reuse, do NOT reinvent: `getLocale()` (`src/utilities/getLocale.server.ts`), `getLocalizedPath(path, locale)` + `removeLocaleFromPath` (`src/utilities/getLocale.ts`), `t(locale, key, params)` + `translations` (`src/i18n/translations.ts`), `locales`/`defaultLocale`/`isValidLocale`/`localeLabels` (`src/i18n/config.ts`).
- apps/courses pages are already `force-dynamic` — keep them dynamic (reading `x-locale` header needs it).
- Migration only via `migrate:create` against `payload_ref`; test on `prod_sim` (real prod dump) before prod. NEVER touch prod/`prod_sim` DBs from a subagent except the documented `payload_ref`/`payload`/`prod_sim` local DBs on localhost:5436.
- Don't end bash commands with `pkill` (exit 144). Dev server on port 3010 (`pnpm dev`).

---

## File structure
- `src/i18n/translations.ts` — add `apps.*` + `courses.*` keys (pl+en) (Task 1)
- `src/i18n/translations.test.ts` — extend coverage test (Task 1)
- `src/middleware.ts` — host-aware locale for apps/courses branches (Task 2)
- `src/app/apps-app/_components/LanguageSwitch.tsx` — new switcher (Task 3)
- `src/app/apps-app/_components/{Nav,Footer}.tsx`, `layout.tsx`, `page.tsx`, `[slug]/page.tsx`, `success/page.tsx`, `download/[token]/page.tsx`, `not-found.tsx` — locale wiring (Task 3)
- `src/app/courses-app/_components/LanguageSwitch.tsx` + `{Nav,Footer,CourseCard,Curriculum,SyllabusHero,Outcomes,InfoCards,LessonView,CtaBand}.tsx`, `layout.tsx`, `page.tsx`, `[slug]/page.tsx`, `[slug]/learn/[lesson]/page.tsx`, `login/page.tsx`, `account/page.tsx`, `not-found.tsx` — locale wiring (Task 4)
- `src/collections/{Products,Lessons,Program}/index.ts` + `src/migrations/<ts>_i18n_localized_content.*` — localized fields (Task 5)
- `tests/e2e` / ad-hoc Playwright + curl — PL/EN smoke (Task 6)

---

### Task 1: Dictionary — apps + courses UI strings (pl + en)

**Files:** Modify `src/i18n/translations.ts`; Modify `src/i18n/translations.test.ts`

**Interfaces:**
- Produces: translation keys under `apps.*` and `courses.*` for both `pl` and `en`, consumed via `t(locale, 'apps.product.buy')` etc. in Tasks 3/4.

- [ ] **Step 1: Audit hard-coded PL strings** in `src/app/apps-app/**` and `src/app/courses-app/**`:
  ```bash
  grep -rhoE '>[A-ZŻŹĆĄŚĘŁÓŃ][^<>{}]{2,}<' src/app/apps-app src/app/courses-app | sort -u | head -80
  ```
  Collect every user-facing PL string (buttons, labels, headings, empty states, success/download messages, grant states, nav brand suffix, "pozostało pobrań", "Kup teraz", "Wkrótce", etc.).

- [ ] **Step 2: Add keys to `translations.ts`** under both `pl` and `en` objects. Mirror the existing flat-key style (`'apps.product.buy': 'Kup teraz'` / `'Buy now'`). Minimum set (extend per audit), each in BOTH locales:
  - `apps.nav.suffix` ("· apps"), `apps.store.eyebrow`, `apps.store.title`, `apps.store.lead`, `apps.store.empty`, `apps.product.eyebrow`, `apps.product.buy`, `apps.product.processing`, `apps.product.error`, `apps.product.note`, `apps.success.title`, `apps.success.body`, `apps.download.invalid`, `apps.download.expired`, `apps.download.limit`, `apps.download.contact`, `apps.download.remaining`, `apps.download.fileHeading`, `apps.notFound.title`, `apps.notFound.cta`, `apps.footer.back`
  - `courses.nav.suffix` ("· kursy"), `courses.store.eyebrow/title/lead/empty`, `courses.syllabus.eyebrow`, `courses.syllabus.metaPhases`, `courses.syllabus.metaStages`, `courses.syllabus.metaTime`, `courses.syllabus.metaGates`, `courses.syllabus.cta`, `courses.syllabus.outcomes`, `courses.syllabus.curriculum`, `courses.syllabus.soon`, `courses.badge.gate`, `courses.badge.hybrid`, `courses.badge.decision`, `courses.infocards.audience`, `courses.infocards.requirements`, `courses.lesson.why`, `courses.lesson.what`, `courses.lesson.dod`, `courses.lesson.deps`, `courses.lesson.prev`, `courses.lesson.next`, `courses.auth.loginTitle`, `courses.auth.accountTitle`, `courses.notFound.title`, `courses.notFound.cta`
  (Use the actual audited PL text as the `pl` value; write natural EN as the `en` value.)

- [ ] **Step 3: Extend the coverage test** in `translations.test.ts` — there is already a test asserting pl/en key parity. Confirm it iterates ALL keys (so new apps/courses keys are auto-covered). If it hard-codes a key list, add an assertion that every `pl` key exists in `en` and vice-versa:
  ```ts
  it('pl and en have identical key sets', () => {
    const plKeys = Object.keys(translationsForTest.pl).sort()
    const enKeys = Object.keys(translationsForTest.en).sort()
    expect(enKeys).toEqual(plKeys)
  })
  ```

- [ ] **Step 4: Run** `pnpm vitest run src/i18n/translations.test.ts --config ./vitest.config.mts` → PASS (pl/en parity holds).

- [ ] **Step 5: Commit** `git add src/i18n && git commit -m "feat(i18n): apps+courses UI dictionary keys (pl+en)"`

### Task 2: Middleware — host-aware locale for apps/courses

**Files:** Modify `src/middleware.ts`

**Interfaces:**
- Produces: on `apps.*`/`courses.*` hosts, requests carry `x-locale` (`pl`|`en`) + `x-pathname`; `/en/...` URLs render EN, prefix-less render PL, `/pl/...` redirects to prefix-less. Consumed by Task 3/4 via `getLocale()`.

- [ ] **Step 1: Read** `src/middleware.ts` fully — note the `isCourses` and `isApps` blocks that `rewrite` to `/courses-app${...}` / `/apps-app${...}`, and the main-host locale logic (`seg === defaultLocale` redirect, `isValidLocale(seg)` pass-through with `x-locale`, else rewrite to `/${defaultLocale}`). Mirror that locale logic INSIDE the host blocks.

- [ ] **Step 2: Add a helper** near the top of the file (after imports):
  ```ts
  // For subdomain (apps/courses) hosts: derive locale from a leading /en or /pl
  // segment, return the locale + the "bare" path (locale stripped). PL is
  // canonical prefix-less. Returns { redirectTo } when a /pl prefix must be
  // bounced to the prefix-less canonical URL.
  function resolveSubLocale(pathname: string):
    | { locale: 'pl' | 'en'; bare: string; redirectTo?: undefined }
    | { redirectTo: string; locale?: undefined; bare?: undefined } {
    const seg = pathname.split('/')[1] ?? ''
    if (seg === defaultLocale) {
      return { redirectTo: stripDefaultLocalePrefix(pathname, defaultLocale) }
    }
    if (isValidLocale(seg)) {
      return { locale: seg as 'pl' | 'en', bare: '/' + pathname.split('/').slice(2).join('/') }
    }
    return { locale: defaultLocale, bare: pathname }
  }
  ```
  (`stripDefaultLocalePrefix`, `isValidLocale`, `defaultLocale` are already imported.)

- [ ] **Step 3: Wire into the `isApps` block.** Currently it does (roughly): if `pathname.startsWith('/apps-app')` → next; if excluded/PUBLIC_FILE → next; else `rewrite('/apps-app' + (pathname==='/'?'':pathname))`. Change the final rewrite path so locale is handled. Replace the apps rewrite tail with:
  ```ts
  const sub = resolveSubLocale(pathname)
  if (sub.redirectTo !== undefined) {
    const url = request.nextUrl.clone(); url.pathname = sub.redirectTo
    return NextResponse.redirect(url)
  }
  const url = request.nextUrl.clone()
  url.pathname = `/apps-app${sub.bare === '/' ? '' : sub.bare}`
  const res = NextResponse.rewrite(url)
  res.headers.set('x-locale', sub.locale)
  res.headers.set('x-pathname', pathname)
  return res
  ```
  NOTE: keep the existing `/apps-app` direct-access + excluded-prefix handling unchanged ABOVE this; only the final "all other paths" rewrite gains locale. The `/en/_next`/`/en/api` case cannot occur (those are excluded before locale resolution).

- [ ] **Step 4: Wire the same into the `isCourses` block** — same pattern, target `/courses-app`. IMPORTANT: the courses block also rewrites `COURSE_PAGE_PREFIXES` (`/login`,`/account`,`/learn`,...) into `/courses-app`. Apply `resolveSubLocale` there too so `/en/login` works (bare `/login` → `/courses-app/login`, x-locale=en). Verify the excluded-prefix branch that handles those still sets `x-locale`.

- [ ] **Step 5: Smoke (dev server on :3010; start with `pnpm dev` in background if needed, never kill with pkill):**
  ```bash
  H='Host: apps.devince.dev'
  curl -s -o /dev/null -w '%{http_code}\n' -H "$H" http://localhost:3010/            # 200 (pl)
  curl -s -o /dev/null -w '%{http_code}\n' -H "$H" http://localhost:3010/en           # 200 (en)
  curl -s -o /dev/null -w '%{http_code}\n' -H "$H" http://localhost:3010/pl           # 307 -> /
  curl -s -o /dev/null -w '%{http_code}\n' -H "$H" http://localhost:3010/idea-to-mvp   # 200
  curl -s -o /dev/null -w '%{http_code}\n' -H "$H" http://localhost:3010/en/idea-to-mvp# 200
  curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3010/pl                    # main site /pl still 307 (unchanged)
  ```
  (UI is still PL everywhere until Task 3/4 wire `t()`; here we only verify routing + 200s + redirects.)

- [ ] **Step 6: Run** `pnpm test:int` (middleware has no unit test by default; if one exists, extend it). Expected: all pass.

- [ ] **Step 7: Commit** `git add src/middleware.ts && git commit -m "feat(i18n): host-aware x-locale routing for apps/courses (/en prefix)"`

### Task 3: apps-app — locale wiring + switcher + localized fetch

**Files:** Create `src/app/apps-app/_components/LanguageSwitch.tsx`; Modify `src/app/apps-app/_components/{Nav,Footer}.tsx`, `layout.tsx`, `page.tsx`, `[slug]/page.tsx`, `success/page.tsx`, `download/[token]/page.tsx`, `not-found.tsx`

**Interfaces:**
- Consumes: `getLocale()`, `t(locale, key)`, `getLocalizedPath(path, locale)`, dictionary keys from Task 1, `x-locale` from Task 2.
- Produces: apps-app renders EN under `/en`, PL otherwise; all internal links locale-prefixed; content fetched with `locale`.

- [ ] **Step 1: LanguageSwitch component.** Create `src/app/apps-app/_components/LanguageSwitch.tsx` (server component — reads current path from `x-pathname` header, renders two links). It receives `locale` + current bare path; render PL/EN links via `getLocalizedPath`:
  ```tsx
  import Link from 'next/link'
  import { headers } from 'next/headers'
  import { locales, localeLabels, type Locale } from '@/i18n'
  import { getLocalizedPath, removeLocaleFromPath } from '@/utilities/getLocale'

  export async function LanguageSwitch({ locale }: { locale: Locale }) {
    const pathname = (await headers()).get('x-pathname') || '/'
    const bare = removeLocaleFromPath(pathname)
    return (
      <div className="lang-switch">
        {locales.map((l) => (
          <Link key={l} href={getLocalizedPath(bare, l)} aria-current={l === locale ? 'true' : undefined}>
            {l.toUpperCase()}
          </Link>
        ))}
      </div>
    )
  }
  ```
  Add minimal `.lang-switch` styling to `app-theme.css` (small inline links; active = accent). Keep markup consistent with nav.

- [ ] **Step 2: Layout** `apps-app/layout.tsx` — `const locale = await getLocale()`; set `<html lang={locale}>`; pass `locale` to `<AppsNav locale={locale}/>` and `<AppsFooter locale={locale}/>`. Keep NO_FOUC theme script.

- [ ] **Step 3: Nav/Footer** — accept `locale: Locale` prop; brand suffix + any labels via `t(locale, 'apps.nav.suffix')` etc.; brand `Link href={getLocalizedPath('/', locale)}`; render `<LanguageSwitch locale={locale} />` in `nav__actions` (before ThemeToggle).

- [ ] **Step 4: Pages** — in each of `page.tsx`, `[slug]/page.tsx`, `success/page.tsx`, `download/[token]/page.tsx`, `not-found.tsx`:
  - `const locale = await getLocale()` at top of the server component.
  - Replace hard-coded PL strings with `t(locale, '<key>')`.
  - `payload.find/findByID(...)` → add `locale` (e.g. storefront `payload.find({ collection:'products', ..., locale })`; product `findByID/find({ ..., locale })`). Safe pre-migration (returns same value).
  - Internal links via `getLocalizedPath(path, locale)` (storefront card → `/${slug}`, pagination, product → success/cancel are server-built Stripe URLs — leave Stripe `success_url`/`cancel_url` as-is in the checkout route; only on-site `<Link>`s get localized).
  - `BuyButton` (client) — unchanged (relative fetch). Pass localized button label as a prop: `<BuyButton slug={slug} label={t(locale,'apps.product.buy')} processingLabel={t(locale,'apps.product.processing')} errorLabel={t(locale,'apps.product.error')} disabled={...} />`; update BuyButton to use the props instead of hard-coded text.
  - `generateMetadata` — derive locale via `getLocale()` and pass `locale` to the meta fetch.

- [ ] **Step 5: Build + smoke (PL/EN):**
  ```bash
  pnpm build   # ignore pre-existing next-sitemap ENOENT (exit 0)
  H='Host: apps.devince.dev'
  curl -s -H "$H" http://localhost:3010/ | grep -ci 'Kup\|Sklep'            # PL strings present
  curl -s -H "$H" http://localhost:3010/en | grep -ci 'Buy\|Store'          # EN strings present
  curl -s -H "$H" http://localhost:3010/en/idea-to-mvp | grep -c 'Buy now'  # EN product
  curl -s -H "$H" http://localhost:3010/en | grep -oE 'href="/en/[^"]*"' | head # internal links keep /en
  ```

- [ ] **Step 6: Commit** `git add src/app/apps-app && git commit -m "feat(i18n): apps-app locale wiring + language switch (pl/en)"`

### Task 4: courses-app — locale wiring + switcher + localized fetch

**Files:** Create `src/app/courses-app/_components/LanguageSwitch.tsx`; Modify `courses-app/_components/{Nav,Footer,CourseCard,Curriculum,SyllabusHero,Outcomes,InfoCards,LessonView,CtaBand,Pagination}.tsx`, `layout.tsx`, `page.tsx`, `[slug]/page.tsx`, `[slug]/learn/[lesson]/page.tsx`, `login/page.tsx`, `account/page.tsx`, `not-found.tsx`

**Interfaces:**
- Consumes: same helpers + Task 1 keys + Task 2 `x-locale`.
- Produces: courses-app renders EN under `/en`, PL otherwise; localized fetch; switcher.

- [ ] **Step 1: LanguageSwitch** — same as apps Task 3 Step 1 but in courses `_components` (markup/styling consistent with courses nav; reuse `course-theme.css`).

- [ ] **Step 2: Layout** `courses-app/layout.tsx` — `const locale = await getLocale()`; `<html lang={locale}>`; pass `locale` to Nav/Footer.

- [ ] **Step 3: Nav/Footer + presentational components** — thread `locale` prop where text is rendered. Components that render fixed PL labels (badges gate/hybrid/decision, section headings "Czego się nauczysz"/"Program", meta labels, lesson section headings why/what/dod, prev/next, infocards headings) → accept `locale` and use `t(locale, '<key>')`. Components that render pure DATA (course title, phase names, lesson content) render the value as-is (localized fetch supplies the right language).

- [ ] **Step 4: Pages** — each page: `const locale = await getLocale()`; `payload.find/findByID({ ..., locale })`; UI text via `t`; internal links via `getLocalizedPath` (storefront→syllabus, "Zacznij"→first lesson, lesson prev/next, login/account links); pass `locale` down to components; `generateMetadata` locale-aware. Gated lesson SSR guard (`enrolledOrAdmin` / session) unchanged. login/account: localize labels; keep auth logic intact.

- [ ] **Step 5: Build + smoke (PL/EN):**
  ```bash
  pnpm build
  H='Host: courses.devince.dev'
  curl -s -o /dev/null -w '%{http_code}\n' -H "$H" http://localhost:3010/      # 200 pl
  curl -s -o /dev/null -w '%{http_code}\n' -H "$H" http://localhost:3010/en    # 200 en
  curl -s -H "$H" http://localhost:3010/en | grep -ci 'course\|Store\|Soon'    # EN UI
  curl -s -o /dev/null -w '%{http_code}\n' -H "$H" http://localhost:3010/en/login # 200
  ```

- [ ] **Step 6: Commit** `git add src/app/courses-app && git commit -m "feat(i18n): courses-app locale wiring + language switch (pl/en)"`

### Task 5: Localized content fields + migration (data-preserving)

**Files:** Modify `src/collections/Products/index.ts`, `src/collections/Lessons/index.ts`, `src/collections/Program/index.ts`; Create `src/migrations/<ts>_i18n_localized_content.*`

**Interfaces:**
- Consumes: locale-aware fetch already wired in Tasks 3/4.
- Produces: `Products.title/description`, `Lessons.title/why/what/dod/content`, `Program` syllabus text fields are `localized: true`; existing values preserved as `pl`.

- [ ] **Step 1: Add `localized: true`** to:
  - `Products`: `title`, `description`.
  - `Lessons`: `title`, `why`, `what`, `dod`, `content`.
  - `Program` Sylabus tab: `phases.name`, `phases.hint`, `outcomes.title`, `outcomes.body`, `audience.item`, `requirements.item`.
  Run `pnpm generate:types`. Expected: types regenerate without error.

- [ ] **Step 2: Generate the migration** against the reference DB:
  ```bash
  DATABASE_URI=postgres://postgres:postgres@localhost:5436/payload_ref pnpm payload migrate
  DATABASE_URI=postgres://postgres:postgres@localhost:5436/payload_ref pnpm payload migrate:create i18n_localized_content
  ```
  Inspect the generated `up()`. It moves the now-localized columns to the `*_locales` tables and DROPs them from the base tables. **This is the data-loss risk.**

- [ ] **Step 3: Add data-preservation to `up()`** — BEFORE the `DROP COLUMN` statements (or after the `_locales` columns are added), copy existing base-table values into the `pl` locale row. For each affected table, ensure a `pl` `_locales` row exists and set the moved value. Pattern (adapt exact column/table names to the generated SQL; `products` has `products_locales` with `_locale`,`_parent_id`):
  ```sql
  -- ensure pl locale rows + copy title/description for products
  INSERT INTO products_locales (_locale, _parent_id, title, description)
  SELECT 'pl', p.id, p.title, p.description FROM products p
  ON CONFLICT (_locale, _parent_id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;
  ```
  Do the analogous copy for lessons (`lessons_locales`) and program syllabus array `_locales` tables. Only THEN allow the base-column drops. If Payload's generated `up()` already drops before you can read, reorder: read base values into temp, add locales cols, insert, drop. Keep it all in the single migration (drizzle runs the whole SQL atomically).

- [ ] **Step 4: Apply to `payload_ref` and dev `payload`, verify data preserved:**
  ```bash
  DATABASE_URI=postgres://postgres:postgres@localhost:5436/payload_ref pnpm payload migrate
  DATABASE_URI=postgres://postgres:postgres@localhost:5436/payload pnpm payload migrate
  pnpm test:int   # all green
  ```

- [ ] **Step 5: PROD-SIM dry run (CRITICAL).** Rebuild `prod_sim` from a fresh prod dump (operator provides `/tmp/prod-schema.sql` is schema-only; for data, request a full dump OR note this step needs the operator). With a data dump loaded into `prod_sim`, run the migration and assert the product's title/description survived as `pl`:
  ```bash
  DATABASE_URI=postgres://postgres:postgres@localhost:5436/prod_sim pnpm payload migrate
  docker exec -e PGPASSWORD=postgres devince_db psql -U postgres -d prod_sim -c "SELECT _locale, title FROM products_locales WHERE _parent_id=1"
  ```
  Expected: a `pl` row with the original title. If no data dump is available, FLAG to the operator that prod has 1 product whose title/description must be verified post-deploy.

- [ ] **Step 6: Smoke localized content** — set an EN title/description on the product via the external API (PATCH supports per-locale? if not, via admin) and confirm `/en/idea-to-mvp` shows EN while `/idea-to-mvp` shows PL. (If per-locale write isn't exposed, this is verified after deploy by the operator.)

- [ ] **Step 7: Commit** `git add src/collections src/migrations src/payload-types.ts && git commit -m "feat(i18n): localize Products/Lessons/Program-syllabus content (data-preserving migration)"`

### Task 6: Final e2e PL/EN + regression

**Files:** none (verification). Dev server on :3010 (background; no pkill).

- [ ] **Step 1: Suite + build** — `pnpm test:int` all pass; `pnpm build` exit 0.

- [ ] **Step 2: Playwright PL/EN smoke** — write `/tmp/i18n-e2e.mjs` (import playwright via the resolved absolute path; CommonJS `import pkg from '...'; const {chromium}=pkg`). For host `apps.devince.dev` (set via `page.route` host header OR `extraHTTPHeaders: { Host: ... }` won't work for navigation — instead test against the prod URL after deploy, or use the dev server with a Host header via request interception). Practically: use `curl` for routing/string assertions on dev, and reserve Playwright for the post-deploy purchase re-test. Assertions:
  - apps PL `/` → PL UI; apps EN `/en` → EN UI; switcher link present (`/en` ↔ `/`).
  - courses PL `/` and EN `/en` → respective UI.
  - product PL vs EN content differs after EN content entered.
  - **Regression:** apps PL `/idea-to-mvp` buy flow still reaches Stripe (checkout API 200); main `devince.dev/` + `/en` unchanged.

- [ ] **Step 3: Isolation/regression curl** (dev):
  ```bash
  for h in apps.devince.dev courses.devince.dev; do
    for p in / /en /idea-to-mvp; do echo "$h$p -> $(curl -s -o /dev/null -w '%{http_code}' -H "Host: $h" http://localhost:3010$p)"; done
  done
  echo "main: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3010/) $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3010/en)"
  ```
  All 200 (or expected redirects). Main site must be byte-for-byte behaviourally unchanged.

- [ ] **Step 4: Push + PR** (base `main`) with summary + the zero-regression evidence + the prod migration note (1 product title/description to verify; the migration is data-preserving + prod_sim-tested). Do NOT deploy from the subagent — the controller/operator merges + monitors (live stores).

## Self-review notes
- Spec coverage: §4.1 middleware → Task 2; §4.2 layout/pages → Tasks 3/4; §4.3 dictionary → Task 1; §4.4 migration → Task 5; §4.5 switcher → Tasks 3/4; §6 zero-regression → Tasks 2/3/4/6; §5 pages → Tasks 3/4.
- Names consistent: `getLocale`/`getLocalizedPath`/`removeLocaleFromPath`/`t`/`resolveSubLocale`/`LanguageSwitch` used identically across tasks.
- Key risk (migration data loss) is isolated in Task 5 with explicit data-preservation + prod_sim gate + low prod data (1 product, 0 courses).
- Deliberate deferrals (per spec §7): localized slug, mail per-locale, Accept-Language detection.
