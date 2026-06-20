# Courses UX v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Personalize the native courses storefront + account by the viewer's progress (with a `featured` pin), and fix the lesson sidebar's independent scroll.

**Architecture:** Additive. One new `Program.featured` boolean (one migration), wired into the external programs API. Pure progress helpers (`courseStatus`, `compareStorefront`) drive an in-memory sort of the storefront (fetch-all → sort → paginate) and the account "my courses" union (purchased ∪ has-progress). The sidebar fix is a CSS flexbox `min-height:0`.

**Tech Stack:** Next.js 15 App Router (RSC), Payload CMS 3.67, PostgreSQL, vitest (`pnpm test:int`), TypeScript.

## Global Constraints

- **Schema only via migrations** (`push:false` stays). `pnpm payload migrate:create program_featured`; dev Postgres already running on `localhost:5436` (use `.env` `DATABASE_URI`, never hardcode the port). Migration additive; prod applies on boot (fail-fast `npx payload migrate && node server.js`).
- **Never `git add -A`.** Stage explicit paths. The repo root has pre-existing untracked files + a stray `src/migrations/20260618_200715_program_price.json` that must NEVER be committed — after `migrate:create`, stage ONLY this migration's new files by name (check `git status --porcelain src/migrations/`).
- **i18n pl + en parity** (enforced by `src/i18n/translations.test.ts`).
- **Courses app is isolated** — style only in `src/app/courses-app/course-theme.css`.
- **TDD for pure logic**; build + smoke for pages; migrate-smoke for the field. `pnpm test:int`, `pnpm build`.
- Deploy is owner-gated unless the user says otherwise; finish with a PR + runbook.
- Bash: don't end a command with `pkill`/`kill`; NEVER use `pkill -f 'next dev'` (it matches its own command line and kills the shell). Stop background dev servers via the task-stop mechanism or a PID.

---

## File Structure

**Modify:**
- `src/collections/Program/index.ts` — add `featured` checkbox field.
- `src/app/(frontend)/api/external/programs/route.ts` — forward `featured` on POST.
- `src/app/(frontend)/api/external/programs/[idOrSlug]/route.ts` — forward `featured` on PATCH.
- `src/app/(frontend)/api/external/programs/programs.test.ts` — add featured forward tests.
- `src/utilities/courseProgress.ts` — add `courseStatus` + `compareStorefront` (pure).
- `src/utilities/courseProgress.test.ts` — add their tests.
- `src/app/courses-app/page.tsx` — fetch-all + per-user progress + sort + in-memory paginate.
- `src/app/courses-app/_components/CourseCard.tsx` — status + featured badges.
- `src/app/courses-app/account/page.tsx` — union purchased ∪ has-progress + status sort.
- `src/i18n/translations.ts` — 3 new keys (pl+en).
- `src/app/courses-app/course-theme.css` — sidebar `min-height:0` scroll fix + the new badge styles.

**Generated:** one migration under `src/migrations/`.

---

## Task 1: `featured` field + migration + external API wire

**Files:**
- Modify: `src/collections/Program/index.ts`, `src/app/(frontend)/api/external/programs/route.ts`, `src/app/(frontend)/api/external/programs/[idOrSlug]/route.ts`
- Test: `src/app/(frontend)/api/external/programs/programs.test.ts`
- Generated: `src/migrations/<ts>_program_featured.{ts,json}`

**Interfaces:**
- Produces: `Program.featured: boolean` (default false), settable via the external programs POST (`{featured}`) and PATCH (`{featured}`).

- [ ] **Step 1: Write the failing API tests**

In `src/app/(frontend)/api/external/programs/programs.test.ts`, add inside the existing `describe('POST /api/external/programs', …)` block (it reuses the file's `makeAuthedReq` + the `getPayloadClient` mock pattern):
```ts
  it('forwards featured to payload.create', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const create = vi.fn().mockResolvedValue({
      id: 9, title: 'F', slug: 'f', _status: 'draft',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    vi.mocked(getPayloadClient).mockResolvedValue({ create } as never)
    const { POST } = await import('./route.js')
    const req = makeAuthedReq('POST', 'http://localhost/api/external/programs', {
      title: 'F', type: 'course', featured: true,
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(create.mock.calls[0][0].data.featured).toBe(true)
  })
```
And add a matching PATCH test inside the existing `describe('PATCH /api/external/programs/[idOrSlug]', …)` block, mirroring the existing `forwards priceCents and currency to payload.update` test's mock + params shape (same `update` mock + `{ params: Promise.resolve({ idOrSlug: '<id>' }) }`), with body `{ featured: true }` and assertion `expect(update.mock.calls[0][0].data.featured).toBe(true)`.

- [ ] **Step 2: Run the tests — verify they fail**

Run: `pnpm test:int src/app/\(frontend\)/api/external/programs/programs.test.ts`
Expected: the two new tests FAIL (`data.featured` is `undefined` — not forwarded yet).

- [ ] **Step 3: Add the `featured` field to Program**

In `src/collections/Program/index.ts`, add this top-level field immediately after the `type` field (the block ending `…defaultValue: 'course', admin: { position: 'sidebar' } },`):
```ts
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      label: 'Polecany',
      admin: {
        position: 'sidebar',
        description: 'Przypięty na górze listy kursów (storefront), niezależnie od postępu użytkownika.',
      },
    },
```

- [ ] **Step 4: Forward `featured` in the POST route**

In `src/app/(frontend)/api/external/programs/route.ts`, in the object passed to `create({ collection: 'program', data: { … } })` (where `...(body.priceCents !== undefined && { priceCents: body.priceCents })` etc. live), add:
```ts
      ...(body.featured !== undefined && { featured: body.featured }),
```
(Use `!== undefined`, not truthiness — `false` is a valid value.)

- [ ] **Step 5: Forward `featured` in the PATCH route**

In `src/app/(frontend)/api/external/programs/[idOrSlug]/route.ts`, alongside the other `if (body.X !== undefined) data.X = body.X` lines, add:
```ts
    if (body.featured !== undefined) data.featured = body.featured
```

- [ ] **Step 6: Regenerate types + run the API tests**

Run: `pnpm generate:types`
Then: `pnpm test:int src/app/\(frontend\)/api/external/programs/programs.test.ts`
Expected: all programs tests PASS (incl. the 2 new featured tests). `src/payload-types.ts` now has `featured?: boolean | null` on `Program`.

- [ ] **Step 7: Create + apply the migration**

Run: `pnpm payload migrate:create program_featured`
Open the generated SQL — confirm it is additive (only `ALTER TABLE "program" ADD COLUMN "featured" boolean DEFAULT false` and the `_program_v` version-table twin; NO drops/alters of other tables). If anything else changes, stop and report.
Then: `pnpm payload migrate` (applies on the dev DB).

- [ ] **Step 8: Commit (stage ONLY this migration's new files by name)**

```bash
git status --porcelain src/migrations/   # identify the new *_program_featured.{ts,json} + index.ts
git add src/collections/Program/index.ts \
  "src/app/(frontend)/api/external/programs/route.ts" \
  "src/app/(frontend)/api/external/programs/[idOrSlug]/route.ts" \
  "src/app/(frontend)/api/external/programs/programs.test.ts" \
  src/payload-types.ts src/migrations/index.ts \
  src/migrations/<ts>_program_featured.ts src/migrations/<ts>_program_featured.json
git commit -m "feat(courses): Program.featured field + migration + external API wire"
```

---

## Task 2: Progress helpers — `courseStatus` + `compareStorefront` (pure, TDD)

**Files:**
- Modify: `src/utilities/courseProgress.ts`
- Test: `src/utilities/courseProgress.test.ts`

**Interfaces:**
- Produces:
  - `courseStatus(done: number, total: number): 'new' | 'in-progress' | 'completed'`.
  - `compareStorefront(a, b)` over `{ featured?: boolean|null; status: 'new'|'in-progress'|'completed'; publishedAt?: string|null }` — featured pinned first, then in-progress → completed → new, then `publishedAt` desc.

- [ ] **Step 1: Write the failing tests**

Append to `src/utilities/courseProgress.test.ts`:
```ts
import { courseStatus, compareStorefront } from './courseProgress'

describe('courseStatus', () => {
  it('new when nothing done (incl. total 0)', () => {
    expect(courseStatus(0, 5)).toBe('new')
    expect(courseStatus(3, 0)).toBe('new')
  })
  it('in-progress when partially done', () => {
    expect(courseStatus(2, 5)).toBe('in-progress')
  })
  it('completed when all (or more) done', () => {
    expect(courseStatus(5, 5)).toBe('completed')
    expect(courseStatus(6, 5)).toBe('completed')
  })
})

describe('compareStorefront', () => {
  const item = (o: Partial<Parameters<typeof compareStorefront>[0]>) =>
    ({ featured: false, status: 'new', publishedAt: null, ...o }) as Parameters<typeof compareStorefront>[0]
  const sorted = (arr: any[]) => [...arr].sort(compareStorefront)

  it('pins featured to the very top regardless of status', () => {
    const a = item({ featured: true, status: 'new' })
    const b = item({ featured: false, status: 'in-progress' })
    expect(sorted([b, a])[0]).toBe(a)
  })
  it('orders in-progress → completed → new among non-featured', () => {
    const ip = item({ status: 'in-progress' })
    const done = item({ status: 'completed' })
    const fresh = item({ status: 'new' })
    expect(sorted([fresh, done, ip])).toEqual([ip, done, fresh])
  })
  it('newest first (publishedAt desc) as the tiebreak within a status', () => {
    const older = item({ status: 'new', publishedAt: '2026-01-01T00:00:00Z' })
    const newer = item({ status: 'new', publishedAt: '2026-06-01T00:00:00Z' })
    expect(sorted([older, newer])).toEqual([newer, older])
  })
})
```

- [ ] **Step 2: Run — verify they fail**

Run: `pnpm test:int src/utilities/courseProgress.test.ts`
Expected: FAIL (`courseStatus` / `compareStorefront` not exported).

- [ ] **Step 3: Implement**

Append to `src/utilities/courseProgress.ts`:
```ts
export function courseStatus(done: number, total: number): 'new' | 'in-progress' | 'completed' {
  if (total > 0 && done >= total) return 'completed'
  if (done > 0) return 'in-progress'
  return 'new'
}

type StorefrontItem = {
  featured?: boolean | null
  status: 'new' | 'in-progress' | 'completed'
  publishedAt?: string | null
}
const STATUS_RANK: Record<StorefrontItem['status'], number> = {
  'in-progress': 0,
  completed: 1,
  new: 2,
}
/** featured pinned first → in-progress → completed → new → newest publishedAt first. */
export function compareStorefront(a: StorefrontItem, b: StorefrontItem): number {
  if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1
  const r = STATUS_RANK[a.status] - STATUS_RANK[b.status]
  if (r !== 0) return r
  const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0
  const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0
  return tb - ta
}
```

- [ ] **Step 4: Run — verify pass**

Run: `pnpm test:int src/utilities/courseProgress.test.ts`
Expected: PASS (all, incl. the existing helper tests).

- [ ] **Step 5: Commit**

```bash
git add src/utilities/courseProgress.ts src/utilities/courseProgress.test.ts
git commit -m "feat(courses): courseStatus + compareStorefront sort helpers"
```

---

## Task 3: Storefront personalization + CourseCard badges + i18n

**Files:**
- Modify: `src/app/courses-app/page.tsx`, `src/app/courses-app/_components/CourseCard.tsx`, `src/i18n/translations.ts`

**Interfaces:**
- Consumes: `courseStatus`, `compareStorefront`, `progressFor` (Task 2 + existing), `Program.featured` (Task 1).
- Produces: storefront sorted featured→in-progress→completed→new, in-memory paginated; `CourseCard` shows in-progress (mini bar + %) / completed (✓) / featured badges.

- [ ] **Step 1: Add i18n keys (pl + en)**

In `src/i18n/translations.ts`, add to BOTH `pl` and `en` (courses section). PL:
```ts
    'courses.store.statusInProgress': 'W trakcie',
    'courses.store.statusCompleted': 'Ukończony',
    'courses.store.featured': 'Polecany',
```
EN:
```ts
    'courses.store.statusInProgress': 'In progress',
    'courses.store.statusCompleted': 'Completed',
    'courses.store.featured': 'Featured',
```

- [ ] **Step 2: Run the i18n parity test**

Run: `pnpm test:int src/i18n/translations.test.ts`
Expected: PASS.

- [ ] **Step 3: Rewrite the storefront page (fetch-all → progress → sort → in-memory paginate)**

Replace the body of `src/app/courses-app/page.tsx` from the `payload.find` call through the `return` with this (keep the imports at top; ADD `import { courseMeta }` already present, and add `import { courseStatus, compareStorefront, progressFor } from '@/utilities/courseProgress'`):
```ts
  // Fetch ALL paid+published courses — we sort by per-user progress (not a DB
  // column), so pagination happens in memory below.
  const res = await payload.find({
    collection: 'program',
    where: { and: [{ type: { equals: 'course' } }, { pricing: { equals: 'paid' } }] },
    limit: 100,
    overrideAccess: false,
    depth: 0,
    locale,
  })
  const allCourses = res.docs

  const programIds = allCourses.map((p) => p.id)
  const lessonsByProgram = new Map<number, Array<Record<string, unknown>>>()
  if (programIds.length > 0) {
    const lessonsRes = await payload.find({
      collection: 'lessons',
      where: { program: { in: programIds } },
      limit: 1000,
      overrideAccess: true,
      depth: 0,
      locale,
    })
    for (const lesson of lessonsRes.docs) {
      const pid = typeof lesson.program === 'object' ? lesson.program?.id : lesson.program
      if (pid == null) continue
      const list = lessonsByProgram.get(pid as number) ?? []
      list.push(lesson as unknown as Record<string, unknown>)
      lessonsByProgram.set(pid as number, list)
    }
  }

  // Per-user completed-lesson counts (logged-in only).
  const doneByProgram = new Map<number, number>()
  if (user && programIds.length > 0) {
    const progRes = await payload.find({
      collection: 'lesson-progress',
      where: { and: [{ user: { equals: user.id } }, { program: { in: programIds } }] },
      limit: 0,
      overrideAccess: true,
      depth: 0,
    })
    for (const row of progRes.docs) {
      const pid = typeof row.program === 'object' && row.program ? row.program.id : row.program
      if (pid == null) continue
      doneByProgram.set(pid as number, (doneByProgram.get(pid as number) ?? 0) + 1)
    }
  }

  const items = allCourses.map((program) => {
    const lessons = (lessonsByProgram.get(program.id) ?? []) as Parameters<typeof courseMeta>[1]
    const meta = courseMeta(program.phases ?? [], lessons)
    const enrolled = isAdmin || purchasedIds.has(program.id)
    const total = lessons.length
    const done = doneByProgram.get(program.id) ?? 0
    return {
      program,
      meta,
      enrolled,
      status: courseStatus(done, total),
      pct: progressFor(total, done).pct,
      featured: !!program.featured,
      publishedAt: program.publishedAt ?? null,
    }
  })
  items.sort(compareStorefront)

  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE))
  const pageItems = items.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <section className="shell" style={{ padding: '64px 0' }}>
      <header className="store-head">
        <span className="eyebrow">
          <i>{t(locale, 'courses.store.eyebrow')}</i>
        </span>
        <h1 className="section-title">{t(locale, 'courses.store.title')}</h1>
      </header>

      {pageItems.length === 0 ? (
        <p className="store-empty">{t(locale, 'courses.store.empty')}</p>
      ) : (
        <div className="store-grid">
          {pageItems.map(({ program, meta, enrolled, status, pct, featured }) => (
            <CourseCard
              key={program.id}
              program={program}
              meta={meta}
              enrolled={enrolled}
              featured={featured}
              status={user ? status : undefined}
              pct={pct}
              locale={locale}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} locale={locale} />
    </section>
  )
```

- [ ] **Step 4: Add status + featured badges to CourseCard**

In `src/app/courses-app/_components/CourseCard.tsx`, extend the props and render badges. Change the signature props to add (after `enrolled`):
```ts
  featured,
  status,
  pct,
```
and the type:
```ts
  program: Program
  meta: CardMeta
  enrolled: boolean
  featured?: boolean
  status?: 'new' | 'in-progress' | 'completed'
  pct?: number
  locale: Locale
```
Then inside `.course-card`, right after the opening `<div className="course-card">`, add the featured + status row:
```tsx
      {featured ? <span className="course-card__featured">{t(locale, 'courses.store.featured')}</span> : null}
      {status === 'in-progress' ? (
        <div className="course-card__status">
          <div className="progressbar">
            <div className="progressbar__track"><div className="progressbar__fill" style={{ width: `${pct ?? 0}%` }} /></div>
          </div>
          <span>{t(locale, 'courses.store.statusInProgress')} · {pct ?? 0}%</span>
        </div>
      ) : status === 'completed' ? (
        <span className="course-card__status done">✓ {t(locale, 'courses.store.statusCompleted')}</span>
      ) : null}
```
(The `'new'` status renders no chip — avoid noise. The buy/continue/details control is unchanged.)

- [ ] **Step 5: Build + smoke**

Run: `pnpm build`
Expected: success. Then with the dev server on 3010:
```bash
curl -s -o /dev/null -m 30 -H "Host: courses.devince.dev" -w "store=%{http_code}\n" "http://localhost:3010/"
```
Expected: `200` (logged-out: featured courses first, no status chips). The logged-in status badges + progress sort are verified live as an enrolled/admin user — note as manual.

- [ ] **Step 6: Commit**

```bash
git add src/app/courses-app/page.tsx src/app/courses-app/_components/CourseCard.tsx src/i18n/translations.ts
git commit -m "feat(courses): storefront personalization — progress sort, status + featured badges"
```

---

## Task 4: Account "my courses" = purchased ∪ has-progress + status sort

**Files:**
- Modify: `src/app/courses-app/account/page.tsx`

**Interfaces:**
- Consumes: `courseStatus` (Task 2), `getCompletedLessonIds`/`progressFor`/`firstIncompleteLesson` (existing), `lesson-progress` collection.

- [ ] **Step 1: Build the union set + sort**

In `src/app/courses-app/account/page.tsx`:

(a) add `courseStatus` to the import:
```ts
import { getCompletedLessonIds, progressFor, firstIncompleteLesson, courseStatus } from '@/utilities/courseProgress'
```

(b) replace the `purchasedIds` + `programs` fetch (the block from `const purchasedIds = …` through the `: []`) with:
```ts
  const purchasedIds = (user.purchases ?? []).map((p: any) => (typeof p === 'object' ? p.id : p))

  // Also include any course the user has progress on (started/completed) — this
  // is what makes the page useful for admins (who own no purchases).
  const progRes = await payload.find({
    collection: 'lesson-progress',
    where: { user: { equals: user.id } },
    limit: 0,
    overrideAccess: true,
    depth: 0,
  })
  const progressProgramIds = progRes.docs
    .map((r: any) => (typeof r.program === 'object' && r.program ? r.program.id : r.program))
    .filter((x: unknown): x is number => typeof x === 'number')

  const unionIds = Array.from(new Set<number>([...purchasedIds, ...progressProgramIds]))
  const programs = unionIds.length
    ? (
        await payload.find({
          collection: 'program',
          where: { id: { in: unionIds } },
          overrideAccess: true,
          depth: 0,
          locale,
        })
      ).docs
    : []
```

(c) after the `progressByProgram` loop, sort `programs` by status (in-progress → completed → not-started):
```ts
  const statusRank = (id: number): number => {
    const pr = progressByProgram.get(id)
    if (!pr) return 2
    const s = courseStatus(pr.done, pr.total)
    return s === 'in-progress' ? 0 : s === 'completed' ? 1 : 2
  }
  ;(programs as any[]).sort((a, b) => statusRank(a.id) - statusRank(b.id))
```

(The empty-state check `programs.length === 0` already handles the no-courses case.)

- [ ] **Step 2: Build + smoke**

Run: `pnpm build`
Expected: success. Then:
```bash
curl -s -o /dev/null -m 30 -H "Host: courses.devince.dev" -w "account_unauth=%{http_code}\n" "http://localhost:3010/account"
```
Expected: `307` (redirects to login when signed out). The union list + sort is verified live as admin/enrolled — note as manual.

- [ ] **Step 3: Commit**

```bash
git add "src/app/courses-app/account/page.tsx"
git commit -m "feat(courses): account lists purchased ∪ started/completed courses, status-sorted"
```

---

## Task 5: Lesson sidebar independent scroll (CSS)

**Files:**
- Modify: `src/app/courses-app/course-theme.css`

**Interfaces:** none (pure CSS).

- [ ] **Step 1: Add `min-height: 0` to the sidebar flex chain**

In `src/app/courses-app/course-theme.css`:
- Change `.navwrap { height: 100%; display: flex; flex-direction: column; }` to add `min-height: 0;`:
```css
.navwrap { height: 100%; display: flex; flex-direction: column; min-height: 0; }
```
- Change `.navlist { flex: 1; overflow-y: auto; padding: 8px 10px 28px; scrollbar-width: thin; }` to add `min-height: 0;`:
```css
.navlist { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 10px 28px; scrollbar-width: thin; }
```
- Add `align-self: start;` to the `.side` rule for grid-item sticky robustness (append to the existing `.side { … }` declaration):
```css
.side { position: sticky; top: var(--nav-h); height: calc(100dvh - var(--nav-h)); overflow: hidden;
  align-self: start;
  border-right: 1px solid var(--line-soft); background: color-mix(in oklab, var(--surface-1) 55%, var(--bg)); }
```

**Why:** in a flex column, a child with `flex:1; overflow-y:auto` won't shrink below its content height unless `min-height:0` is set — so the nav list overflows/clips the height-capped `.side` instead of scrolling inside it, forcing whole-page scroll. `min-height:0` lets it scroll internally.

- [ ] **Step 2: Add the storefront badge styles**

Append to the pro-UX section of `course-theme.css`:
```css
/* Storefront card status + featured badges */
.course-card__featured { display: inline-block; align-self: start; font-size: 11px; font-weight: 600; letter-spacing: .02em;
  color: var(--bg); background: var(--accent); border-radius: 99px; padding: 2px 10px; margin-bottom: 8px; }
.course-card__status { display: flex; align-items: center; gap: 8px; margin: 6px 0 2px; font-size: 12px; color: var(--text-mut); }
.course-card__status .progressbar { flex: 1; max-width: 120px; }
.course-card__status.done { color: var(--done); font-weight: 600; }
```

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: success. (The sidebar scroll is verified live in a long-lesson course as an enrolled/admin user — note as manual.)

- [ ] **Step 4: Commit**

```bash
git add src/app/courses-app/course-theme.css
git commit -m "style(courses): sidebar independent scroll (flex min-height:0) + storefront badges"
```

---

## Task 6: Verify + PR

**Files:** none (verification + PR).

- [ ] **Step 1: Full suite**

Run: `pnpm test:int`
Expected: all green (new + existing).

- [ ] **Step 2: Build + lint**

Run: `pnpm build` then `pnpm lint`
Expected: build success; lint exit 0 (warnings only, consistent with the repo).

- [ ] **Step 3: Smoke (fresh dev server)**

storefront `200`, account-unauth `307`, lesson-unauth `307`; storefront logged-out shows featured first.

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feat/courses-ux-v2
gh pr create --base main --head feat/courses-ux-v2 --title "feat(courses): UX v2 — storefront/account personalization + sidebar scroll" --body "<runbook>"
```
PR body MUST include a deploy runbook: (1) merge → deploy; (2) the only schema change is `program_featured` (additive, applies on boot — confirm the `featured` column); (3) no env changes; (4) set `featured:true` on the course(s) to pin via CMS or `PATCH /api/external/programs/<idOrSlug> {"featured":true}`. Owner runs deploy unless told otherwise.

---

## Self-Review

**Spec coverage:** A storefront sort+badges (T2,T3) ✓; featured field+API (T1) ✓; B account union+sort (T4) ✓; C sidebar scroll (T5) ✓; i18n (T3) ✓; migration (T1) ✓; verify/PR (T6) ✓.

**Placeholder scan:** No TBD/"handle edge cases". The PATCH featured test references "mirror the existing currency PATCH test's mock+params" — that exact harness (mock + `params: Promise.resolve(...)`) lives in the same test file the implementer edits; the assertion + body are given. The migration filename `<ts>` is a real generated timestamp, resolved at `migrate:create`.

**Type consistency:** `courseStatus(done,total)→'new'|'in-progress'|'completed'` and `compareStorefront({featured,status,publishedAt})` are used identically in T3 (storefront) + T4 (account). `progressFor(total,done)` arg order matches the existing helper. `CourseCard` new props (`featured?`, `status?`, `pct?`) match what T3's page passes.
