# courses.devince.dev — storefront + Sylabus design — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dedicated `courses.devince.dev` subdomain with its own Sylabus-derived theme — a paginated paid-courses storefront, a data-driven syllabus page per course, and gated lesson pages — without touching the rest of devince.dev. Plus Phase 0: switch the app from `push:true` to Payload migrations so deploys stop breaking prod.

**Architecture:** Host-based middleware rewrite sends `courses.devince.dev/X` to a real route segment `app/courses-app/X` that has its OWN root layout + `course-theme.css` (adapted from the handoff `course.css`), fully isolated from `app/(frontend)`. Course/syllabus/lesson data comes from the existing `Program` + `Lessons` collections, extended with phase/stage metadata so the syllabus renders data-driven. Payload migrations replace `push:true` and run on container boot.

**Tech Stack:** Next.js 15 App Router, Payload 3.67 (collections, migrations, access functions), Postgres, vitest, Playwright. Design source: `COurses-handoff/courses/project/` (user's own design handoff — adapt visually, don't copy DOM-builder JS).

**Spec:** `docs/superpowers/specs/2026-06-10-courses-subdomain-design.md`

**Key implementation note:** the spec's `(courses)` route group is implemented as a real segment **`app/courses-app/`** (route groups add no URL segment, so two `/page.tsx` would collide; a real segment is the rewrite target and gives an isolated root layout). Browser URLs stay clean via internal rewrite.

---

## File structure (new/changed)

- `payload.config.ts` — `push:false`, migrations config (F0)
- `src/migrations/0001_init.ts` (+ snapshot) — baseline migration (F0)
- `scripts/migrate.mjs` — boot-time migration runner (F0)
- `scripts/reconcile-prod-migrations.ts` — one-off prod schema reconcile (F0)
- `src/middleware.ts` — host detection + rewrite to `/courses-app` (C1)
- `src/app/courses-app/layout.tsx` — isolated root layout (C1)
- `src/app/courses-app/course-theme.css` — adapted design tokens/components (C1)
- `src/app/courses-app/_components/` — Nav, Footer, ThemeToggle, Badge, Card, Pagination, Hero, Curriculum, etc. (C1/C3/C4/C5)
- `src/collections/Program/index.ts` — phases/outcomes/audience/requirements (C2)
- `src/collections/Lessons/index.ts` — nr/phaseId/hardGate/hybrid/kind/estTimeMin/why/what/dod/skills/dependencies (C2)
- `src/utilities/courseMeta.ts` (+ `.test.ts`) — meta calc helper (C4)
- `src/app/courses-app/page.tsx` — storefront list + pagination (C3)
- `src/app/courses-app/[slug]/page.tsx` — syllabus (C4)
- `src/app/courses-app/[slug]/learn/[lesson]/page.tsx` — gated lesson (C5)
- `src/app/courses-app/{login,account}/page.tsx` — themed auth (C6)
- `scripts/import-course.ts` — extend to map `pipeline.json` → model (C6)

---

## FAZA 0 — Migrations foundation

### Task F0.1: Switch to migrations config

**Files:** Modify `src/payload.config.ts`; delete `src/migrations/20251207_174832.json`

- [ ] **Step 1: Remove the stale snapshot**

```bash
git rm src/migrations/20251207_174832.json
```
(It references old `courses`/`workshops` collections that no longer exist and corrupts `migrate:create`.)

- [ ] **Step 2: Configure migrations in payload.config.ts**

In the `postgresAdapter({ pool, push: true })` block, change `push: true` → `push: false` and add the migration dir:
```ts
db: postgresAdapter({
  pool: { connectionString: process.env.DATABASE_URI || '' },
  push: false,
  migrationDir: path.resolve(dirname, 'migrations'),
}),
```

- [ ] **Step 3: Verify config compiles**

Run: `pnpm generate:types`
Expected: no error.

- [ ] **Step 4: Commit**

```bash
git add src/payload.config.ts src/migrations/20251207_174832.json
git commit -m "chore(db): switch Payload to migrations (push:false) + drop stale snapshot"
```

### Task F0.2: Generate the baseline migration against a fresh DB

**Files:** Create `src/migrations/0001_init.ts` (+ its snapshot `.json`) via the CLI.

- [ ] **Step 1: Create a fresh reference DB**

```bash
docker exec -e PGPASSWORD=postgres devince_db dropdb -U postgres --if-exists payload_ref
docker exec -e PGPASSWORD=postgres devince_db createdb -U postgres payload_ref
```

- [ ] **Step 2: Generate the baseline migration from the empty DB**

Run (DATABASE_URI overridden to the fresh DB so the diff = full schema):
```bash
DATABASE_URI=postgres://postgres:postgres@localhost:5436/payload_ref pnpm payload migrate:create init
```
Expected: a new `src/migrations/<timestamp>_init.ts` (full `up()` creating every table/enum) + matching snapshot `.json`. If the CLI prompts, accept.

- [ ] **Step 3: Verify the migration applies cleanly to the fresh DB**

```bash
DATABASE_URI=postgres://postgres:postgres@localhost:5436/payload_ref pnpm payload migrate
DATABASE_URI=postgres://postgres:postgres@localhost:5436/payload_ref pnpm payload migrate:status
```
Expected: status shows the baseline as applied; no errors.

- [ ] **Step 4: Commit**

```bash
git add src/migrations/
git commit -m "feat(db): baseline Payload migration (full schema)"
```

### Task F0.3: Boot-time migration runner

**Files:** Create `scripts/migrate.mjs`

- [ ] **Step 1: Write the runner**

```js
// scripts/migrate.mjs — run pending Payload migrations before the server starts.
import { getPayload } from 'payload'
import config from '../src/payload.config.js'

const run = async () => {
  const payload = await getPayload({ config })
  await payload.db.migrate()
  console.log('[migrate] migrations up to date')
  process.exit(0)
}
run().catch((e) => {
  console.error('[migrate] FAILED', e)
  process.exit(1)
})
```
NOTE: verify the import path resolves in the standalone build (the compiled config may be at a different path — adjust to the build output, e.g. import from `@payload-config` if the alias is available at runtime; otherwise point at the emitted config). Confirm `payload.db.migrate()` is the correct API in 3.67 (fallback: `payload.migrate()`); use whichever exists.

- [ ] **Step 2: Test locally against the fresh DB**

```bash
DATABASE_URI=postgres://postgres:postgres@localhost:5436/payload_ref node scripts/migrate.mjs
```
Expected: `[migrate] migrations up to date`, exit 0.

- [ ] **Step 3: Document the container start command**

Add to the spec/README: the Coolify/Docker **start command** must become:
`node scripts/migrate.mjs && node .next/standalone/server.js`
(This is an operational change the user applies in Coolify; the plan only provides the script. Flag it explicitly in the execution summary.)

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate.mjs
git commit -m "feat(db): boot-time migration runner (scripts/migrate.mjs)"
```

### Task F0.4: Prod reconcile script (one-off)

**Files:** Create `scripts/reconcile-prod-migrations.ts`

Prod already has most of the schema (hand-patched) but lacks the course tables and has no `payload_migrations` rows. This script makes prod consistent with the migration history WITHOUT dropping anything.

- [ ] **Step 1: Write the reconcile script**

It must (run against the PROD DB via the operator):
1. `CREATE TABLE IF NOT EXISTS payload_migrations (...)` (match Payload's shape: id, name, batch, updated_at, created_at).
2. Insert the baseline migration name with a batch number, marking it "already applied" (prod has the baseline schema).
3. Apply the **missing course tables** additively: extract their DDL from a fresh `payload_ref` push (as done for the `_locales` hotfix) — `lessons`, `_lessons_v*`, `course_assets`, `stripe_events`, `users_roles`, and the `users_rels`/`program_rels` rows for purchases. Use `CREATE TABLE IF NOT EXISTS` + `ON CONFLICT DO NOTHING`.
4. **Enum name:** prod's locale enum is `enum__locales`, not `_locales` — any new table referencing the locale enum must reference `public.enum__locales` (string-replace the dumped DDL).
5. Wrap in a transaction; print a summary.

```ts
// scripts/reconcile-prod-migrations.ts (skeleton — fill the DDL from payload_ref dump)
import 'dotenv/config'
import { Client } from 'pg'

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URI })
  await c.connect()
  await c.query('BEGIN')
  await c.query(`CREATE TABLE IF NOT EXISTS payload_migrations (
    id serial PRIMARY KEY, name varchar, batch numeric,
    updated_at timestamptz DEFAULT now(), created_at timestamptz DEFAULT now())`)
  // mark baseline as applied if not present
  await c.query(`INSERT INTO payload_migrations (name, batch)
    SELECT $1, 1 WHERE NOT EXISTS (SELECT 1 FROM payload_migrations WHERE name = $1)`, [process.env.BASELINE_NAME])
  // ... CREATE TABLE IF NOT EXISTS for each missing course table (DDL from payload_ref, enum__locales) ...
  await c.query('COMMIT')
  console.log('reconcile done')
  await c.end()
}
main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Generate the course-table DDL from payload_ref**

```bash
docker exec -e PGPASSWORD=postgres devince_db pg_dump -U postgres --schema-only --no-owner \
  -t public.lessons -t 'public._lessons_v*' -t public.course_assets -t public.stripe_events -t public.users_roles \
  payload_ref > /tmp/course-tables.sql
```
Paste the relevant `CREATE TABLE`/index/FK statements into the script, `s/public\._locales/public.enum__locales/g`, and make each idempotent.

- [ ] **Step 3: Test against a copy of the prod dump**

Restore the existing prod backup into a scratch DB and run the script against it; verify the course tables appear and `payload_migrations` has the baseline row. (Backup: `/root/devince-backup-*.sql` on the server.)

- [ ] **Step 4: Commit**

```bash
git add scripts/reconcile-prod-migrations.ts
git commit -m "feat(db): one-off prod migration reconcile (additive course tables + baseline marker)"
```

> **F0 done when:** baseline migration applies to a fresh DB; `migrate.mjs` runs clean; reconcile script tested against a prod-dump copy. The actual prod reconcile + start-command change happen at deploy time (operator step).

---

## C1 — Subdomain routing + isolated theme

### Task C1.1: Host-based rewrite in middleware

**Files:** Modify `src/middleware.ts`

- [ ] **Step 1: Add host detection + rewrite (before the [locale] logic)**

After the `EXCLUDED_PREFIXES`/`PUBLIC_FILE` early-return, insert:
```ts
const host = request.headers.get('host') ?? ''
const isCourses = host.split(':')[0].startsWith('courses.')
if (isCourses) {
  // already rewritten? avoid double-prefixing
  if (!pathname.startsWith('/courses-app')) {
    const url = request.nextUrl.clone()
    url.pathname = `/courses-app${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }
  return NextResponse.next()
}
// (block direct access to /courses-app on the main host)
if (pathname.startsWith('/courses-app')) {
  return NextResponse.redirect(new URL(pathname.replace(/^\/courses-app/, '') || '/', `https://courses.devince.dev`))
}
```
Keep `/api`, `/_next`, `/admin` excluded (they already are) so the Stripe webhook etc. stay shared.

- [ ] **Step 2: Add `/courses-app` to the matcher-safe excludes for the [locale] rewrite**

Ensure the existing `[locale]` rewrite does NOT also fire for `/courses-app` (the host branch returns first, so it won't — but add `/courses-app` to `EXCLUDED_PREFIXES` defensively).

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: compiles (no courses-app routes yet → 404 on rewrite is fine until C3).

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(courses): host-aware rewrite courses.* -> /courses-app"
```

### Task C1.2: Isolated root layout + theme CSS

**Files:** Create `src/app/courses-app/layout.tsx`, `src/app/courses-app/course-theme.css`, `src/app/courses-app/_components/ThemeToggle.tsx`

- [ ] **Step 1: Port the design CSS**

Create `src/app/courses-app/course-theme.css` by adapting `COurses-handoff/courses/project/course/course.css` verbatim (tokens `:root` dark + `:root.light`, base, `.nav/.brand/.btn/.badge/.eyebrow/.section-title/.pl/.foot/.ph-video`, dotted bg). Keep it scoped by only importing it in this layout.

- [ ] **Step 2: Theme toggle (no FOUC)**

```tsx
// src/app/courses-app/_components/ThemeToggle.tsx
'use client'
import { useEffect, useState } from 'react'
export function ThemeToggle() {
  const [light, setLight] = useState(false)
  useEffect(() => { setLight(document.documentElement.classList.contains('light')) }, [])
  const toggle = () => {
    const next = !light
    document.documentElement.classList.toggle('light', next)
    try { localStorage.setItem('course:theme', next ? 'light' : 'dark') } catch {}
    setLight(next)
  }
  return (
    <button className="btn btn--ghost" type="button" onClick={toggle} aria-pressed={light}>
      <span className="icon" data-i="theme" aria-hidden="true" />
      <span className="btn__label">{light ? 'Ciemny' : 'Jasny'}</span>
    </button>
  )
}
```

- [ ] **Step 3: Root layout with inline theme init**

```tsx
// src/app/courses-app/layout.tsx
import React from 'react'
import './course-theme.css'
import { CoursesNav } from './_components/Nav'
import { CoursesFooter } from './_components/Footer'

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  const initTheme = `(function(){try{var t=localStorage.getItem('course:theme');if(t==='light')document.documentElement.classList.add('light')}catch(e){}})()`
  return (
    <html lang="pl" className="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: initTheme }} /></head>
      <body>
        <CoursesNav />
        <main>{children}</main>
        <CoursesFooter />
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Nav + Footer components** (`_components/Nav.tsx`, `_components/Footer.tsx`)

Server components matching the handoff nav/foot markup (brand „Devince · kursy" linking to `/`, links: Kursy (`/`), Konto (`/account`), `ThemeToggle`, primary CTA). Footer = `.foot` with `.shell` two-span layout. Use the design's `.nav`, `.brand .mark`, `.btn` classes.

- [ ] **Step 5: Verify build**

Run: `pnpm lint && pnpm build`
Expected: compiles; `/courses-app` now has a root layout.

- [ ] **Step 6: Commit**

```bash
git add src/app/courses-app/
git commit -m "feat(courses): isolated courses-app layout + course theme + nav/footer/toggle"
```

---

## C2 — Data model extension

### Task C2.1: Program syllabus fields

**Files:** Modify `src/collections/Program/index.ts`

- [ ] **Step 1: Add a "Sylabus" tab with phases/outcomes/audience/requirements**

Add a new tab (after "Treść") with:
```ts
{
  label: 'Sylabus',
  fields: [
    { name: 'phases', type: 'array', labels: { singular: 'Faza', plural: 'Fazy' }, fields: [
      { name: 'id', type: 'text', required: true, admin: { description: 'np. A, B, C' } },
      { name: 'name', type: 'text', required: true },
      { name: 'hint', type: 'textarea' },
    ]},
    { name: 'outcomes', type: 'array', fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'body', type: 'textarea' },
    ]},
    { name: 'audience', type: 'array', fields: [{ name: 'item', type: 'text', required: true }] },
    { name: 'requirements', type: 'array', fields: [{ name: 'item', type: 'text', required: true }] },
    { name: 'level', type: 'select', options: [
      { label: 'Początkujący', value: 'beginner' },
      { label: 'Średniozaawansowany', value: 'intermediate' },
      { label: 'Zaawansowany', value: 'advanced' },
    ]},
  ],
}
```

- [ ] **Step 2: Regenerate types + migration**

```bash
pnpm generate:types
DATABASE_URI=postgres://postgres:postgres@localhost:5436/payload_ref pnpm payload migrate:create program_syllabus_fields
```
(Generate the incremental migration against the up-to-date `payload_ref`.)

- [ ] **Step 3: Verify build**

Run: `pnpm build`

- [ ] **Step 4: Commit**

```bash
git add src/collections/Program/index.ts src/payload-types.ts src/migrations/
git commit -m "feat(courses): Program syllabus fields (phases/outcomes/audience/requirements)"
```

### Task C2.2: Lessons stage metadata

**Files:** Modify `src/collections/Lessons/index.ts`

- [ ] **Step 1: Add stage fields**

```ts
{ name: 'nr', type: 'number', label: 'Numer etapu' },
{ name: 'phaseId', type: 'text', label: 'ID fazy (A–I)' },
{ name: 'hardGate', type: 'checkbox', label: 'Hard gate (nieskippowalny)' },
{ name: 'hybrid', type: 'checkbox', label: 'Hybrydowy / IRL' },
{ name: 'kind', type: 'select', defaultValue: 'normal', options: [
  { label: 'Normalny', value: 'normal' }, { label: 'Decyzja', value: 'decision' },
]},
{ name: 'estTimeMin', type: 'group', fields: [
  { name: 'min', type: 'number' }, { name: 'max', type: 'number' },
]},
{ name: 'why', type: 'textarea', label: 'Po co (why)' },
{ name: 'what', type: 'textarea', label: 'Co robisz (what)' },
{ name: 'dod', type: 'textarea', label: 'Definition of Done' },
{ name: 'skills', type: 'array', fields: [{ name: 'skill', type: 'text', required: true }] },
{ name: 'dependencies', type: 'relationship', relationTo: 'lessons', hasMany: true, label: 'Wymagane wcześniej' },
```

- [ ] **Step 2: Types + migration**

```bash
pnpm generate:types
DATABASE_URI=postgres://postgres:postgres@localhost:5436/payload_ref pnpm payload migrate:create lessons_stage_meta
```

- [ ] **Step 3: Build + commit**

```bash
pnpm build
git add src/collections/Lessons/index.ts src/payload-types.ts src/migrations/
git commit -m "feat(courses): Lessons stage metadata (nr/phaseId/hardGate/hybrid/kind/estTimeMin/why/what/dod/skills/deps)"
```

---

## C4 prerequisite: meta helper (TDD)

### Task C4.0: courseMeta helper

**Files:** Create `src/utilities/courseMeta.ts`, `src/utilities/courseMeta.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { courseMeta } from './courseMeta'

const lessons = [
  { phaseId: 'A', hardGate: false, estTimeMin: { min: 20, max: 45 } },
  { phaseId: 'A', hardGate: true,  estTimeMin: { min: 60, max: 240 } },
  { phaseId: 'B', hardGate: false, estTimeMin: { min: 30, max: 60 } },
] as any
const phases = [{ id: 'A' }, { id: 'B' }] as any

describe('courseMeta', () => {
  it('counts phases, stages, hard gates and sums time range', () => {
    expect(courseMeta(phases, lessons)).toEqual({
      phases: 2, stages: 3, hardGates: 1, timeMin: 110, timeMax: 345,
    })
  })
})
```

- [ ] **Step 2: Run → fail.** `pnpm test:int` (module missing).

- [ ] **Step 3: Implement**

```ts
// src/utilities/courseMeta.ts
type Lesson = { phaseId?: string | null; hardGate?: boolean | null; estTimeMin?: { min?: number | null; max?: number | null } | null }
type Phase = { id?: string | null }
export function courseMeta(phases: Phase[] = [], lessons: Lesson[] = []) {
  const timeMin = lessons.reduce((a, l) => a + (l.estTimeMin?.min ?? 0), 0)
  const timeMax = lessons.reduce((a, l) => a + (l.estTimeMin?.max ?? 0), 0)
  return {
    phases: phases.length,
    stages: lessons.length,
    hardGates: lessons.filter((l) => l.hardGate).length,
    timeMin, timeMax,
  }
}
```

- [ ] **Step 4: Run → pass.** `pnpm test:int`

- [ ] **Step 5: Commit**

```bash
git add src/utilities/courseMeta.ts src/utilities/courseMeta.test.ts
git commit -m "feat(courses): courseMeta helper (phases/stages/hard-gates/time)"
```

---

## C3 — Storefront (list + pagination)

### Task C3.1: Storefront page + Card + Pagination

**Files:** Create `src/app/courses-app/page.tsx`, `_components/CourseCard.tsx`, `_components/Pagination.tsx`

- [ ] **Step 1: Pagination component** (themed, mono)

```tsx
// _components/Pagination.tsx — links to ?page=N, prev/next + numbers, course theme classes
import Link from 'next/link'
export function Pagination({ page, totalPages, basePath = '/' }: { page: number; totalPages: number; basePath?: string }) {
  if (totalPages <= 1) return null
  const href = (p: number) => (p === 1 ? basePath : `${basePath}?page=${p}`)
  return (
    <nav className="pagination" aria-label="Paginacja">
      {page > 1 && <Link className="btn btn--ghost" href={href(page - 1)}>Poprzednia</Link>}
      <span className="mono">{page} / {totalPages}</span>
      {page < totalPages && <Link className="btn btn--ghost" href={href(page + 1)}>Następna</Link>}
    </nav>
  )
}
```

- [ ] **Step 2: Course card** (`.oc`-style)

```tsx
// _components/CourseCard.tsx
import Link from 'next/link'
import { courseMeta } from '@/utilities/courseMeta'
export function CourseCard({ program }: { program: any }) {
  const m = courseMeta(program.phases ?? [], program.lessons ?? [])
  return (
    <Link className="course-card" href={`/${program.slug}`}>
      <span className="eyebrow">Kurs</span>
      <h3>{program.title}</h3>
      {program.heroDescription && <p>{program.heroDescription}</p>}
      <div className="course-card__meta mono">
        <span>{m.phases} faz</span><span>{m.stages} etapów</span>
        {program.pricing === 'paid' && <span className="course-card__price">Płatny</span>}
      </div>
    </Link>
  )
}
```
(Add `.course-card` styles to `course-theme.css` using existing tokens — border, surface-1, hover, radius.)

- [ ] **Step 3: Storefront page**

```tsx
// src/app/courses-app/page.tsx
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { CourseCard } from './_components/CourseCard'
import { Pagination } from './_components/Pagination'
export const dynamic = 'force-dynamic'
const PER_PAGE = 9
export default async function Storefront({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const payload = await getPayload({ config: configPromise })
  const res = await payload.find({
    collection: 'program',
    where: { and: [{ type: { equals: 'course' } }, { pricing: { equals: 'paid' } }] },
    limit: PER_PAGE, page, overrideAccess: false,
    // include lessons for meta — depth or a follow-up query; see note
  })
  return (
    <div className="shell">
      <header className="store-head"><span className="eyebrow">Kursy</span><h1 className="section-title">Płatne kursy</h1></header>
      {res.docs.length === 0 && <p className="store-empty">Brak dostępnych kursów.</p>}
      <div className="store-grid">{res.docs.map((p: any) => <CourseCard key={p.id} program={p} />)}</div>
      <Pagination page={res.page ?? 1} totalPages={res.totalPages ?? 1} />
    </div>
  )
}
```
NOTE: `lessons` aren't a join on Program; to show per-card meta either (a) add a Payload `join` field on Program → lessons, or (b) do one `payload.find({collection:'lessons', where:{program:{in: ids}}})` and group by program. Implement (b) for the storefront (cheap), pass counts into the card.

- [ ] **Step 4: Storefront styles** in `course-theme.css` (`.store-grid` responsive grid, `.course-card`, `.store-head`, `.pagination`). Use tokens; match the Sylabus visual language.

- [ ] **Step 5: Verify**

Run: `pnpm lint && pnpm build`. Dev smoke: `curl -H 'Host: courses.devince.dev' localhost:3010/` → storefront renders (or test via `/courses-app` directly).

- [ ] **Step 6: Commit**

```bash
git add src/app/courses-app/page.tsx src/app/courses-app/_components/ src/app/courses-app/course-theme.css
git commit -m "feat(courses): storefront with paginated course cards"
```

---

## C4 — Syllabus page (data-driven Sylabus)

### Task C4.1: Syllabus page + sections

**Files:** Create `src/app/courses-app/[slug]/page.tsx` + `_components/{Hero,Outcomes,Curriculum,InfoCards,CtaBand}.tsx`

- [ ] **Step 1: Query the course + its lessons**

`[slug]/page.tsx` (force-dynamic): `payload.find program where slug` (overrideAccess true — landing is public marketing), then `payload.find lessons where program=id, sort nr` (overrideAccess true for the syllabus listing — it shows titles/metadata, not gated bodies). Compute `courseMeta(program.phases, lessons)`. 404 if no program.

- [ ] **Step 2: Hero (variant A only)** — `_components/Hero.tsx`

Render the handoff's variant-A markup: eyebrow, `<h1>` (heroHeadline or title), lead (heroDescription), `meta` chips (from courseMeta: `{phases} faz`, `{stages} etapy`, `{timeMin}–{timeMax} min` via an hours/min formatter, `{hardGates} hard-gate`), CTA „Zacznij" → first lesson's learn URL, and the `.spine-card` aside listing phases (`id`, `name`, etapy count). Use design classes (`.hero`, `.spine`, `.meta .m`, `.btn`).

- [ ] **Step 3: Outcomes + Curriculum + InfoCards + CtaBand** components

- Outcomes: map `program.outcomes` → `.oc` cards (numbered).
- Curriculum: for each `program.phases` → `.phase-block` head (`.pl` id, name, hint, etapy count) + rows = lessons with `phaseId===phase.id` sorted by `nr`; each row `.srow` → link `/[slug]/learn/[lessonSlug]`, `.srow__nr` (pad nr), name + badges (`hardGate`→`badge gate`+lock icon, `hybrid`→`badge hybrid`, `kind==='decision'`→`badge decision`), `.srow__time` from estTimeMin, arrow.
- InfoCards: two `.infocard` (audience / requirements) from arrays.
- CtaBand: `.cta-band` with course CTA.

Match the handoff CSS (port the page-specific `<style>` from `Sylabus.html` into `course-theme.css` or a co-located module).

- [ ] **Step 4: SEO** — `generateMetadata` using program meta fields.

- [ ] **Step 5: Verify**

`pnpm lint && pnpm build`. Smoke: a course slug renders hero+curriculum with correct counts/badges.

- [ ] **Step 6: Commit**

```bash
git add src/app/courses-app/\[slug\]/ src/app/courses-app/_components/ src/app/courses-app/course-theme.css
git commit -m "feat(courses): data-driven syllabus page (hero A, outcomes, curriculum, infocards, cta)"
```

---

## C5 — Lesson page (gated)

### Task C5.1: Gated lesson page

**Files:** Create `src/app/courses-app/[slug]/learn/[lesson]/page.tsx` + `_components/LessonView.tsx`

- [ ] **Step 1: SSR gate + data**

Mirror the existing `/learn` guard: `payload.auth({headers})`; no user → `redirect('/login?next=...')`; resolve program by slug (overrideAccess true); compute enrollment (`user.purchases` includes program.id or admin) → else `redirect('/'+slug)` (paywall = syllabus). Then `payload.find lessons where program & slug, overrideAccess:false, user` (enforces `enrolledOrAdmin`). 404 if none.

- [ ] **Step 2: Lesson view** — port `Lekcja.html`

Render: lhead (phase chip + nr + title + badges), `.ph-video` with `youtubeEmbedUrl` iframe (or striped placeholder), sections why/what/dod (`.lsec`), `.deplist` from `dependencies`, `.pager` prev/next by `nr` within the course, `.side` sidebar listing the phase's stages with current highlighted. Use design classes.

- [ ] **Step 3: Verify gating**

`pnpm lint && pnpm build`. Smoke (no session): `/[slug]/learn/[lesson]` → 307 `/login?next=...`.

- [ ] **Step 4: Commit**

```bash
git add src/app/courses-app/\[slug\]/learn/ src/app/courses-app/_components/
git commit -m "feat(courses): gated lesson page (Lekcja design)"
```

---

## C6 — Themed auth + data import

### Task C6.1: Themed login/account

**Files:** Create `src/app/courses-app/login/page.tsx`, `src/app/courses-app/account/page.tsx`

- [ ] **Step 1: Reuse the existing auth logic, restyle**

Copy the behavior of `(frontend)/login` + `(frontend)/account` (REST `/api/users/login`, `payload.auth` for account) into the courses-app theme (course classes `.btn`, surfaces). Account lists the user's purchased courses linking to `/[slug]`.

- [ ] **Step 2: Verify** `pnpm lint && pnpm build`; `/login`, `/account` render in course theme; `/account` no session → redirect login.

- [ ] **Step 3: Commit**

```bash
git add src/app/courses-app/login/ src/app/courses-app/account/
git commit -m "feat(courses): themed login + account under courses-app"
```

### Task C6.2: Extend import to map pipeline.json

**Files:** Modify `scripts/import-course.ts`

- [ ] **Step 1: Map pipeline → model**

Read `~/skills-projects/idea-to-mvp-course/.../pipeline.json` (or the handoff `pipeline.json`). For the course Program: set `phases` (id/name/hint from pipeline-data), `outcomes`/`audience`/`requirements` (from the Sylabus copy). For each stage → upsert the matching Lesson by slug: set `nr`, `phaseId` (faza), `hardGate`, `hybrid`, `kind` (type), `estTimeMin`, `why`, `what`, `dod`, `skills`, `dependencies` (resolve `required_predecessors` nr → lesson ids). Idempotent.

- [ ] **Step 2: Run + verify** `pnpm tsx scripts/import-course.ts`; confirm a course's syllabus now renders fully.

- [ ] **Step 3: Commit**

```bash
git add scripts/import-course.ts
git commit -m "feat(courses): import maps pipeline.json -> Program.phases + Lessons stage meta"
```

---

## Self-Review (author)

- **Spec coverage:** F0↔§4, C1↔§5/§6, C2↔§7, C3↔§8.1, C4↔§8.2, C5↔§8.3, C6 auth↔§8.4 + import↔§7. Theme scope (§6) in C1.2. Edge cases (§9) folded into C3/C4/C5. ✔
- **Placeholders:** real code for middleware, layout, theme toggle, courseMeta (TDD), storefront, pagination, card, migrate runner; design-heavy components (Hero/Curriculum/LessonView) reference exact handoff markup/classes to port — not "TODO". Operator steps (Coolify start command, prod reconcile) explicitly flagged as out-of-code. ✔
- **Type consistency:** `courseMeta(phases, lessons)` signature consistent; Lesson fields (`nr/phaseId/hardGate/hybrid/kind/estTimeMin/why/what/dod/skills/dependencies`) consistent between C2, C4, C5, C6; `pricing/type` query consistent. ✔
- **Order:** F0 → C1/C2 → C4.0 → C3/C4/C5/C6. F0 is a hard prerequisite for any deploy.
- **Operator actions (not code):** (1) Coolify start command → `node scripts/migrate.mjs && node .next/standalone/server.js`; (2) run `scripts/reconcile-prod-migrations.ts` against prod once before the first migration-based deploy; (3) `courses.devince.dev` DNS already added by user.
