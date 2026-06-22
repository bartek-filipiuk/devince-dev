# Public Roadmap page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A curated, public, status-tagged product roadmap at `/roadmap` on both apps.devince.dev and courses.devince.dev, editable from the Payload admin, localized PL/EN.

**Architecture:** New Payload global `Roadmap` (localized array of items) → two thin `force-dynamic` server pages (`apps-app/roadmap`, `courses-app/roadmap`) that fetch the global and render a shared `RoadmapView` component. Grouping logic is a pure, unit-tested helper. Styling is one CSS file built on the shared theme CSS variables, so the same markup adapts to each surface's palette. A nav link is added on both surfaces. Curated starter content is seeded via a one-off script.

**Tech Stack:** Next.js 15 App Router (RSC), Payload CMS 3.67 (PostgreSQL), TypeScript, vitest, existing i18n (`t(locale, key)`), Playwright for host smoke. No new dependencies.

## Global Constraints

- **No new 3rd-party dependencies.** Use only what the repo already has (`tsx`, `dotenv`, `vitest`, `playwright` are present).
- **Schema ONLY via migrations** (`push:false`). After model change: `pnpm generate:types` + `pnpm payload migrate:create <name>`, commit the `.ts` AND `.json` snapshot. Dev DB: Postgres on `localhost:5436` (`docker compose up -d`), `DATABASE_URI` already in `.env`.
- **Localized fields:** `title`, `description` are `localized: true`; `status`, `track` are non-localized enums. Writing a localized array per-locale WITHOUT row ids replaces the array and drops the other locale — the seed script carries ids forward (pl → read ids → en by id).
- **i18n parity:** every key must exist in BOTH `pl` and `en` blocks of `src/i18n/translations.ts` (enforced by `src/i18n/translations.test.ts`). Type `TranslationKey` derives from the `pl` block.
- **Curated PUBLIC content only.** No VAT-invoices item (owner decision). Never mirror internal `docs/ROADMAP.md`.
- **Both surfaces share class names** (`.shell`, `.section-title`) and CSS variables (`--accent`, `--gate`, `--done`, `--hybrid`, `--decision`, `--line`, `--line-soft`, `--text`, `--text-mut`, `--accent-soft`, `--hybrid-soft`, `--decision-soft`, `--gate-soft`, `--r-card`, `--r-chip`, `--maxw`). Both `app-theme.css` and `course-theme.css` define them identically-named.
- **Locale routing for apps/courses:** PL = prefix-less path (`/roadmap`); EN = `/en/roadmap`. Middleware rewrites into `/apps-app|/courses-app` and sets the `x-locale` header. ONE page file serves both locales; `getLocale()` reads `x-locale`. Use `getLocalizedPath('/roadmap', locale)` for links.
- **Branch:** `feat/public-roadmap` from `main`. Commit per task with explicit paths (NEVER `git add -A`). NO deploy. NO push to `main`.
- **Bash:** kill the dev server with `fuser -k 3010/tcp` — NEVER `pkill -f 'next dev'`.

---

### Task 1: `groupByStatus` pure helper (TDD)

**Files:**
- Create: `src/components/Roadmap/groupByStatus.ts`
- Test: `src/components/Roadmap/groupByStatus.test.ts`

**Interfaces:**
- Produces: `type RoadmapStatus = 'planned' | 'in_progress' | 'done'`; `interface RoadmapGroup<T> { status: RoadmapStatus; items: T[] }`; `function groupByStatus<T extends { status: RoadmapStatus }>(items: T[]): RoadmapGroup<T>[]` — returns groups in fixed order `in_progress → planned → done`, preserving input order within a group, omitting empty groups.

- [ ] **Step 1: Write the failing test**

Create `src/components/Roadmap/groupByStatus.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { groupByStatus, type RoadmapStatus } from './groupByStatus'

const item = (status: RoadmapStatus, id: string) => ({ status, id })

describe('groupByStatus', () => {
  it('orders groups in_progress → planned → done', () => {
    const out = groupByStatus([item('done', 'a'), item('planned', 'b'), item('in_progress', 'c')])
    expect(out.map((g) => g.status)).toEqual(['in_progress', 'planned', 'done'])
  })

  it('preserves input order within a group', () => {
    const out = groupByStatus([item('planned', 'a'), item('planned', 'b'), item('planned', 'c')])
    expect(out[0].items.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('omits status groups that have no items', () => {
    const out = groupByStatus([item('done', 'a')])
    expect(out.map((g) => g.status)).toEqual(['done'])
  })

  it('returns an empty array for empty input', () => {
    expect(groupByStatus([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/components/Roadmap/groupByStatus.test.ts --config ./vitest.config.mts`
Expected: FAIL — `Failed to resolve import "./groupByStatus"` (file does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/Roadmap/groupByStatus.ts`:

```ts
export type RoadmapStatus = 'planned' | 'in_progress' | 'done'

export interface RoadmapGroup<T> {
  status: RoadmapStatus
  items: T[]
}

// Display order: what's being worked on first, then what's coming, then shipped.
const STATUS_ORDER: RoadmapStatus[] = ['in_progress', 'planned', 'done']

export function groupByStatus<T extends { status: RoadmapStatus }>(items: T[]): RoadmapGroup<T>[] {
  return STATUS_ORDER.map((status) => ({
    status,
    items: items.filter((it) => it.status === status),
  })).filter((group) => group.items.length > 0)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/components/Roadmap/groupByStatus.test.ts --config ./vitest.config.mts`
Expected: PASS — 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/Roadmap/groupByStatus.ts src/components/Roadmap/groupByStatus.test.ts
git commit -m "feat(roadmap): groupByStatus helper with TDD"
```

---

### Task 2: `Roadmap` Payload global + migration

**Files:**
- Create: `src/Roadmap/config.ts`
- Modify: `src/payload.config.ts` (import + `globals` array)
- Create: `src/migrations/<generated>_roadmap_global.ts` + `.json` (via `migrate:create`)
- Regenerate: `src/payload-types.ts` (via `generate:types`)

**Interfaces:**
- Produces: global slug `'roadmap'` with field `items` (array). Generated type `Roadmap` in `@/payload-types`; each row has `title: string`, `description?: string | null`, `status: 'planned' | 'in_progress' | 'done'`, `track: 'general' | 'apps' | 'courses'`, `id?: string | null`.

- [ ] **Step 1: Ensure the dev DB is up and migrated to baseline**

Run: `docker compose up -d && pnpm payload migrate`
Expected: containers up; "Done" / "No migrations to run" (baseline applied, no error).

- [ ] **Step 2: Create the global config**

Create `src/Roadmap/config.ts`:

```ts
import type { GlobalConfig } from 'payload'

export const Roadmap: GlobalConfig = {
  slug: 'roadmap',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'items',
      type: 'array',
      labels: { singular: 'Roadmap item', plural: 'Roadmap items' },
      admin: { initCollapsed: true },
      fields: [
        { name: 'title', type: 'text', required: true, localized: true },
        { name: 'description', type: 'textarea', localized: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'planned',
          options: [
            { label: 'Planned', value: 'planned' },
            { label: 'In progress', value: 'in_progress' },
            { label: 'Done', value: 'done' },
          ],
        },
        {
          name: 'track',
          type: 'select',
          required: true,
          defaultValue: 'general',
          options: [
            { label: 'General', value: 'general' },
            { label: 'Apps', value: 'apps' },
            { label: 'Courses', value: 'courses' },
          ],
        },
      ],
    },
  ],
}
```

- [ ] **Step 3: Register the global**

In `src/payload.config.ts`, add the import next to the other global imports (near `import { SiteSettings } from './SiteSettings/config'`):

```ts
import { Roadmap } from './Roadmap/config'
```

And change the globals array (currently `globals: [Header, Footer, SiteSettings],`) to:

```ts
  globals: [Header, Footer, SiteSettings, Roadmap],
```

- [ ] **Step 4: Regenerate types**

Run: `pnpm generate:types`
Expected: completes without error; `src/payload-types.ts` now contains a `Roadmap` interface with an `items` array.

- [ ] **Step 5: Generate the migration**

Run: `pnpm payload migrate:create roadmap_global`
Expected: a new pair `src/migrations/<timestamp>_roadmap_global.ts` + `.json` is created (additive — creates `roadmap`, `roadmap_items`, and the `_locales` table for localized subfields; no destructive ops, no NOT NULL backfill on existing rows since the global is new).

- [ ] **Step 6: Apply and verify the migration**

Run: `pnpm payload migrate`
Expected: the `roadmap_global` migration runs and reports success.

Confirm it registered as applied:
Run: `pnpm payload migrate:status`
Expected: the `roadmap_global` migration is listed with state `Yes` (applied). (Full type-check happens via `pnpm build` in Task 4 — `generate:types` + `migrate` succeeding here already proves the config loads and the schema is valid.)

- [ ] **Step 7: Commit**

```bash
git add src/Roadmap/config.ts src/payload.config.ts src/payload-types.ts src/migrations/
git commit -m "feat(roadmap): add Roadmap global + migration"
```

---

### Task 3: i18n keys (PL + EN) + parity test

**Files:**
- Modify: `src/i18n/translations.ts` (add keys to BOTH `pl` and `en` blocks)
- Modify: `src/i18n/translations.test.ts` (extend the required-key list)

**Interfaces:**
- Produces translation keys usable via `t(locale, key)`: `roadmap.meta`, `roadmap.title`, `roadmap.lead`, `roadmap.empty`, `roadmap.status.planned`, `roadmap.status.in_progress`, `roadmap.status.done`, `roadmap.track.general`, `roadmap.track.apps`, `roadmap.track.courses`, `apps.nav.roadmap`, `courses.nav.roadmap`.

- [ ] **Step 1: Add a failing assertion for the new keys**

In `src/i18n/translations.test.ts`, inside the `required` array (the test "covers the apps + courses subdomain UI keys"), add these three entries (after `'courses.notFound.cta',`):

```ts
      'roadmap.status.in_progress',
      'apps.nav.roadmap',
      'courses.nav.roadmap',
```

- [ ] **Step 2: Run the i18n test to verify it fails**

Run: `pnpm exec vitest run src/i18n/translations.test.ts --config ./vitest.config.mts`
Expected: FAIL — `missing key "roadmap.status.in_progress"` (keys not added yet).

- [ ] **Step 3: Add the keys to the `pl` block**

In `src/i18n/translations.ts`, inside the `pl: { ... }` object (before its closing `},` that precedes `en: {`), add:

```ts
    // Roadmap
    'roadmap.meta': 'Roadmapa',
    'roadmap.title': 'Roadmapa produktu',
    'roadmap.lead': 'Co już działa i co budujemy dalej.',
    'roadmap.empty': 'Wkrótce pojawią się tu plany rozwoju.',
    'roadmap.status.planned': 'Planowane',
    'roadmap.status.in_progress': 'W trakcie',
    'roadmap.status.done': 'Gotowe',
    'roadmap.track.general': 'Ogólne',
    'roadmap.track.apps': 'Apps',
    'roadmap.track.courses': 'Kursy',
    'apps.nav.roadmap': 'Roadmap',
    'courses.nav.roadmap': 'Roadmap',
```

- [ ] **Step 4: Add the keys to the `en` block**

In the same file, inside the `en: { ... }` object (before its closing `},` that precedes `} as const`), add:

```ts
    // Roadmap
    'roadmap.meta': 'Roadmap',
    'roadmap.title': 'Product roadmap',
    'roadmap.lead': "What's live and what we're building next.",
    'roadmap.empty': 'Plans will appear here soon.',
    'roadmap.status.planned': 'Planned',
    'roadmap.status.in_progress': 'In progress',
    'roadmap.status.done': 'Done',
    'roadmap.track.general': 'General',
    'roadmap.track.apps': 'Apps',
    'roadmap.track.courses': 'Courses',
    'apps.nav.roadmap': 'Roadmap',
    'courses.nav.roadmap': 'Roadmap',
```

- [ ] **Step 5: Run the full i18n test to verify it passes**

Run: `pnpm exec vitest run src/i18n/translations.test.ts --config ./vitest.config.mts`
Expected: PASS — all i18n tests green (parity holds: same keys in pl and en, none empty).

- [ ] **Step 6: Commit**

```bash
git add src/i18n/translations.ts src/i18n/translations.test.ts
git commit -m "feat(roadmap): i18n keys (pl/en) for roadmap + nav"
```

---

### Task 4: `RoadmapView` component + styles + both pages

**Files:**
- Create: `src/components/Roadmap/RoadmapView.tsx`
- Create: `src/components/Roadmap/roadmap.css`
- Create: `src/app/apps-app/roadmap/page.tsx`
- Create: `src/app/courses-app/roadmap/page.tsx`

**Interfaces:**
- Consumes: `groupByStatus` (Task 1), `Roadmap` type (Task 2), i18n keys (Task 3), `getLocale` from `@/utilities/getLocale.server`, `getLocalizedPath` from `@/utilities/getLocale`.
- Produces: `RoadmapView({ items, locale })` server component; routes `/roadmap` on both subdomains.

- [ ] **Step 1: Create the styles**

Create `src/components/Roadmap/roadmap.css`:

```css
.roadmap { padding: 64px 0; }
.roadmap__head { margin-bottom: 40px; }
.roadmap__lead { color: var(--text-mut); margin-top: 8px; max-width: 60ch; }

.roadmap__groups { display: flex; flex-direction: column; gap: 40px; }

.roadmap__group-title {
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--text-mut); margin: 0 0 16px;
}
.roadmap__dot { width: 9px; height: 9px; border-radius: 50%; background: var(--accent); flex: none; }
.roadmap__group--in_progress .roadmap__dot { background: var(--gate); }
.roadmap__group--done .roadmap__dot { background: var(--done); }

.roadmap__list {
  list-style: none; margin: 0; padding: 0;
  display: grid; gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.roadmap__card {
  border: 1px solid var(--line);
  border-radius: var(--r-card);
  padding: 16px 18px;
  transition: border-color 0.15s ease;
}
.roadmap__card:hover { border-color: var(--accent-line); }
.roadmap__group--done .roadmap__card { opacity: 0.82; }

.roadmap__chip {
  display: inline-block; font-size: 11px; letter-spacing: 0.03em;
  padding: 2px 8px; border-radius: var(--r-chip); margin-bottom: 8px;
  color: var(--text-mut); background: var(--line-soft);
}
.roadmap__chip--apps { color: var(--accent); background: var(--accent-soft); }
.roadmap__chip--courses { color: var(--hybrid); background: var(--hybrid-soft); }
.roadmap__chip--general { color: var(--decision); background: var(--decision-soft); }

.roadmap__card-title { font-size: 16px; margin: 0 0 4px; color: var(--text); }
.roadmap__card-desc { font-size: 14px; color: var(--text-mut); margin: 0; line-height: 1.5; }
.roadmap__empty { color: var(--text-mut); }

@media (max-width: 640px) {
  .roadmap__list { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Create the view component**

Create `src/components/Roadmap/RoadmapView.tsx`:

```tsx
import './roadmap.css'
import { t, type Locale, type TranslationKey } from '@/i18n'
import type { Roadmap } from '@/payload-types'
import { groupByStatus } from './groupByStatus'

type RoadmapItem = NonNullable<Roadmap['items']>[number]

export function RoadmapView({ items, locale }: { items: RoadmapItem[]; locale: Locale }) {
  const groups = groupByStatus(items)

  return (
    <section className="shell roadmap">
      <header className="roadmap__head">
        <h1 className="section-title">{t(locale, 'roadmap.title')}</h1>
        <p className="roadmap__lead">{t(locale, 'roadmap.lead')}</p>
      </header>

      {groups.length === 0 ? (
        <p className="roadmap__empty">{t(locale, 'roadmap.empty')}</p>
      ) : (
        <div className="roadmap__groups">
          {groups.map((group) => (
            <div key={group.status} className={`roadmap__group roadmap__group--${group.status}`}>
              <h2 className="roadmap__group-title">
                <span className="roadmap__dot" aria-hidden />
                {t(locale, `roadmap.status.${group.status}` as TranslationKey)}
              </h2>
              <ul className="roadmap__list">
                {group.items.map((item, i) => (
                  <li key={item.id ?? i} className="roadmap__card">
                    <span className={`roadmap__chip roadmap__chip--${item.track}`}>
                      {t(locale, `roadmap.track.${item.track}` as TranslationKey)}
                    </span>
                    <h3 className="roadmap__card-title">{item.title}</h3>
                    {item.description ? (
                      <p className="roadmap__card-desc">{item.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Create the apps page**

Create `src/app/apps-app/roadmap/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { getLocale } from '@/utilities/getLocale.server'
import { t } from '@/i18n'
import { RoadmapView } from '@/components/Roadmap/RoadmapView'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return { title: t(locale, 'roadmap.meta') }
}

export default async function AppsRoadmapPage() {
  const locale = await getLocale()
  const payload = await getPayload({ config: configPromise })
  const roadmap = await payload.findGlobal({ slug: 'roadmap', locale, depth: 0 })
  const items = Array.isArray(roadmap.items) ? roadmap.items : []
  return <RoadmapView items={items} locale={locale} />
}
```

- [ ] **Step 4: Create the courses page**

Create `src/app/courses-app/roadmap/page.tsx` (identical except the component name):

```tsx
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { getLocale } from '@/utilities/getLocale.server'
import { t } from '@/i18n'
import { RoadmapView } from '@/components/Roadmap/RoadmapView'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return { title: t(locale, 'roadmap.meta') }
}

export default async function CoursesRoadmapPage() {
  const locale = await getLocale()
  const payload = await getPayload({ config: configPromise })
  const roadmap = await payload.findGlobal({ slug: 'roadmap', locale, depth: 0 })
  const items = Array.isArray(roadmap.items) ? roadmap.items : []
  return <RoadmapView items={items} locale={locale} />
}
```

- [ ] **Step 5: Build to verify everything compiles**

Run: `pnpm build`
Expected: build succeeds; `/apps-app/roadmap` and `/courses-app/roadmap` appear in the route list as dynamic (`ƒ`) routes; no type errors from the new files.

- [ ] **Step 6: Commit**

```bash
git add src/components/Roadmap/RoadmapView.tsx src/components/Roadmap/roadmap.css src/app/apps-app/roadmap/page.tsx src/app/courses-app/roadmap/page.tsx
git commit -m "feat(roadmap): RoadmapView + /roadmap pages on apps + courses"
```

---

### Task 5: Nav „Roadmap" link on both surfaces

**Files:**
- Modify: `src/app/apps-app/_components/Nav.tsx`
- Modify: `src/app/courses-app/_components/Nav.tsx`

**Interfaces:**
- Consumes: i18n keys `apps.nav.roadmap` / `courses.nav.roadmap` (Task 3), `getLocalizedPath`.

- [ ] **Step 1: Add the link to the apps nav**

In `src/app/apps-app/_components/Nav.tsx`, the component currently jumps from the brand `</Link>` straight to `<div className="nav__spacer" />`. Insert a links block between them so it reads:

```tsx
      </Link>
      <div className="nav__links">
        <Link href={getLocalizedPath('/roadmap', locale)}>{t(locale, 'apps.nav.roadmap')}</Link>
      </div>
      <div className="nav__spacer" />
```

(`Link`, `t`, and `getLocalizedPath` are already imported in this file.)

- [ ] **Step 2: Add the link to the courses nav**

In `src/app/courses-app/_components/Nav.tsx`, the existing `nav__links` block has Courses + Account links. Add the Roadmap link between them:

```tsx
      <div className="nav__links">
        <Link href={getLocalizedPath('/', locale)}>{t(locale, 'courses.nav.courses')}</Link>
        <Link href={getLocalizedPath('/roadmap', locale)}>{t(locale, 'courses.nav.roadmap')}</Link>
        <Link href={getLocalizedPath('/account', locale)}>{t(locale, 'courses.nav.account')}</Link>
      </div>
```

- [ ] **Step 3: Build to verify the navs compile**

Run: `pnpm build`
Expected: build succeeds, no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/apps-app/_components/Nav.tsx src/app/courses-app/_components/Nav.tsx
git commit -m "feat(roadmap): add Roadmap nav link on apps + courses"
```

---

### Task 6: Seed curated content + full local verification

**Files:**
- Create: `scripts/seed-roadmap.ts`

**Interfaces:**
- Consumes: the `roadmap` global (Task 2). Idempotent: overwrites the global's `items` each run (a global is a single row).

- [ ] **Step 1: Create the seed script**

Create `scripts/seed-roadmap.ts`:

```ts
/**
 * Seed the public Roadmap global with curated PL + EN content.
 *
 * USAGE:  pnpm tsx scripts/seed-roadmap.ts
 *
 * Idempotent: overwrites the global's `items` on every run.
 * Localized two-pass: write PL (creates row ids) → read ids back → write EN by id
 * so EN title/description land on the same rows without wiping PL.
 *
 * Curated PUBLIC content only — VAT invoices intentionally excluded.
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

type Status = 'planned' | 'in_progress' | 'done'
type Track = 'general' | 'apps' | 'courses'

const ITEMS: { status: Status; track: Track; pl: [string, string]; en: [string, string] }[] = [
  // Done
  { status: 'done', track: 'general', pl: ['Płatności BLIK i karta', 'Bezpieczne płatności online, jednorazowo.'], en: ['BLIK & card payments', 'Secure one-time online checkout.'] },
  { status: 'done', track: 'apps', pl: ['Pobieranie po zakupie bez konta', 'Kupujesz, dostajesz podpisany link — bez rejestracji.'], en: ['Account-free downloads', 'Buy, get a signed link — no sign-up.'] },
  { status: 'done', track: 'general', pl: ['Pełne wersje PL i EN', 'Cała platforma dwujęzyczna.'], en: ['Full PL & EN versions', 'The whole platform is bilingual.'] },
  { status: 'done', track: 'apps', pl: ['Progi cenowe Starter/Pro/Agency', 'Wybór licencji na stronie produktu.'], en: ['Starter/Pro/Agency tiers', 'Pick a license on the product page.'] },
  { status: 'done', track: 'courses', pl: ['Czytnik lekcji i postęp', 'Czytelne lekcje z podświetlaniem kodu i śledzeniem postępu.'], en: ['Lesson reader & progress', 'Clean lessons with code highlighting and progress tracking.'] },
  // Planned
  { status: 'planned', track: 'courses', pl: ['„Zapytaj kurs" — AI-asystent', 'Pytania do treści kursu z odpowiedziami na bazie lekcji.'], en: ['"Ask the course" AI tutor', "Ask questions answered from the course's own lessons."] },
  { status: 'planned', track: 'apps', pl: ['„Zapytaj produkt" — czat przedsprzedażowy', 'Odpowiedzi o produkcie wprost na jego stronie.'], en: ['"Ask the product" pre-sale chat', 'Answers about the product, right on its page.'] },
  { status: 'planned', track: 'courses', pl: ['Certyfikaty ukończenia', 'Weryfikowalny certyfikat po ukończeniu kursu.'], en: ['Completion certificates', 'A verifiable certificate when you finish.'] },
  { status: 'planned', track: 'courses', pl: ['Maile przypominające o postępie', 'Delikatne przypomnienia, żeby dokończyć kurs.'], en: ['Progress nudge emails', 'Gentle reminders to finish the course.'] },
  { status: 'planned', track: 'apps', pl: ['Order bumps przy zakupie', 'Powiązane produkty w jednym checkoutcie.'], en: ['Checkout order bumps', 'Related products in a single checkout.'] },
  { status: 'planned', track: 'apps', pl: ['Kup raz, dostajesz aktualizacje', 'Nowe wersje produktu do ponownego pobrania.'], en: ['Buy once, get updates', 'Re-download new versions of your product.'] },
  { status: 'planned', track: 'apps', pl: ['Opinie zweryfikowanych kupujących', 'Recenzje od osób, które faktycznie kupiły.'], en: ['Verified-buyer reviews', 'Reviews from people who actually bought.'] },
  { status: 'planned', track: 'apps', pl: ['Strony produktów: screeny i lista funkcji', 'Galeria zrzutów i przejrzysty spis możliwości.'], en: ['Product pages: screenshots & features', 'A screenshot gallery and a clear feature list.'] },
]

async function main() {
  console.log('=== seed-roadmap ===')
  const payload = await getPayload({ config: configPromise })

  // Pass 1 — write PL (creates row ids, sets status/track + PL text).
  await payload.updateGlobal({
    slug: 'roadmap',
    locale: 'pl',
    data: {
      items: ITEMS.map((it) => ({
        status: it.status,
        track: it.track,
        title: it.pl[0],
        description: it.pl[1],
      })),
    } as never,
  })

  // Read ids back (PL locale), then write EN by id so EN text lands on the same rows.
  const plDoc = await payload.findGlobal({ slug: 'roadmap', locale: 'pl', depth: 0 })
  const rows = Array.isArray(plDoc.items) ? plDoc.items : []
  if (rows.length !== ITEMS.length) {
    throw new Error(`expected ${ITEMS.length} rows after PL write, got ${rows.length}`)
  }

  // Pass 2 — write EN by id (carry status/track + ids forward).
  await payload.updateGlobal({
    slug: 'roadmap',
    locale: 'en',
    data: {
      items: rows.map((row, i) => ({
        id: row.id,
        status: ITEMS[i].status,
        track: ITEMS[i].track,
        title: ITEMS[i].en[0],
        description: ITEMS[i].en[1],
      })),
    } as never,
  })

  console.log(`Seeded ${ITEMS.length} roadmap items (PL + EN).`)
  process.exit(0)
}

main().catch((err) => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Run the seed**

Run: `pnpm tsx scripts/seed-roadmap.ts`
Expected: prints `Seeded 13 roadmap items (PL + EN).` and exits 0.

- [ ] **Step 3: Run the full integration suite**

Run: `pnpm test:int`
Expected: all green (includes `groupByStatus` + i18n parity). Note the pass count.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: success; `/apps-app/roadmap` and `/courses-app/roadmap` present as dynamic routes.

- [ ] **Step 5: Host smoke (Playwright) — both surfaces, PL + EN**

Start the dev server in the background, then smoke. Use the playwright-skill; map both hosts to localhost.

Run (start dev): `pnpm dev` (background; listens on :3010)

Smoke matrix (expect HTTP 200 and roadmap content rendered):
- `http://apps.devince.dev:3010/roadmap` (PL) → 200, shows „Roadmapa produktu" + „Gotowe"/„Planowane" groups + at least one card.
- `http://apps.devince.dev:3010/en/roadmap` (EN) → 200, shows "Product roadmap" + "Done"/"Planned".
- `http://courses.devince.dev:3010/roadmap` (PL) → 200, same content, courses theme.
- `http://courses.devince.dev:3010/en/roadmap` (EN) → 200.

Playwright launch with host mapping: `--host-resolver-rules="MAP apps.devince.dev 127.0.0.1, MAP courses.devince.dev 127.0.0.1"` (or set the `Host` header per request). Assert the H1 text and that a `.roadmap__card` exists. Take one screenshot per surface for the record.

Expected: all four 200; the in_progress group is absent (none seeded) — only „W trakcie"/"In progress" missing, others present; this confirms empty groups are omitted.

- [ ] **Step 6: Stop the dev server**

Run: `fuser -k 3010/tcp`
(NEVER `pkill -f 'next dev'`.)

- [ ] **Step 7: Commit**

```bash
git add scripts/seed-roadmap.ts
git commit -m "feat(roadmap): curated seed script + verified local smoke"
```

---

## Notes for the executor

- After all tasks: dispatch the final whole-branch review (superpowers:requesting-code-review) on the most capable model, then use superpowers:finishing-a-development-branch to present push/PR options. **Do NOT deploy. Do NOT push to `main`.**
- The stray migration `src/migrations/20260618_200715_program_price.json` must NEVER be committed — only `git add` the explicit paths listed per task.
- If `migrate:create` reports "No changes detected", the global wasn't registered — recheck Task 2 Step 3 before proceeding.
