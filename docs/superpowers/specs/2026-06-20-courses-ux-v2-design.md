# Courses UX v2 — storefront + account personalization, sidebar scroll

> **Date:** 2026-06-20. Approved via brainstorming. Branch `feat/courses-ux-v2`
> (from `main` `cda5998`). Follow-up to Courses Pro UX (PR #44, live). Three
> live-feedback items for the NATIVE devince courses (`courses.devince.dev`):
> personalize the storefront list by the viewer's progress + a "featured" pin,
> make the account "my courses" useful (incl. for admin), and fix the lesson
> sidebar's independent scroll.

## Scope (locked)

**In:**
- **A. Storefront personalization** (`courses.devince.dev/`) — sort the course
  list by the logged-in viewer's progress (featured → in-progress → completed →
  new) and show a per-card status (in-progress + %, completed, new). A new
  `featured` flag pins a course to the absolute top regardless of progress.
- **B. Account "my courses"** (`/account`) — list = purchased **∪** courses the
  user has any progress on (started/completed), sorted in-progress → completed →
  not-started, with the existing progress bars. Admin (no purchases) now sees the
  courses they've started.
- **C. Lesson sidebar independent scroll** — the lesson nav (`.side`/`.navwrap`/
  `.navlist`) scrolls within itself so reaching a lesson never scrolls the whole
  page (the flexbox `min-height:0` fix).
- **Schema:** add `featured: boolean` (default `false`) to `Program` (1 additive
  migration); settable in the admin CMS and via the external programs API.

**Out (deliberately):** changing which courses the storefront shows (still
`type=course` + `pricing=paid`); free/lead-magnet courses on the storefront;
reordering within a status group beyond a simple stable secondary; account for
non-customer admin management views beyond "my started/owned courses".

## Locked decisions
- **Storefront sort order:** `featured` (true first, absolute top) → in-progress
  → completed → new. Secondary tiebreak within a group: `publishedAt` desc
  (stable). Logged-out viewers have no progress → effectively featured → newest.
- **Status semantics (per course, per user):** `completed` = `total>0 && done==total`;
  `in-progress` = `0<done<total`; `new` = `done==0`. `done` = count of the user's
  `lesson-progress` rows for that program; `total` = the program's lesson count.
- **Account set:** purchased program ids ∪ program ids with ≥1 `lesson-progress`
  row for the user. Admin's "enrolled in all" role does NOT flood this list — only
  courses they actually started appear (plus any purchases).
- **Pagination:** the storefront must sort by per-user progress, which is not a
  DB column, so it fetches all paid+published courses (high limit) and sorts +
  paginates **in memory**, keeping the existing `Pagination` (9/page).
- **Featured field:** `checkbox` on `Program`, additive migration (`ADD COLUMN
  featured boolean DEFAULT false`), wired into the external programs POST/PATCH
  allowlist.

## Current state (grounding)
- `src/app/courses-app/page.tsx` — storefront: fetches paid+published courses
  with DB pagination (`PER_PAGE=9`), one lessons query for `courseMeta`, renders
  `CourseCard`. Already fetches `user` + `purchasedIds` + `isAdmin`.
- `src/app/courses-app/_components/CourseCard.tsx` — pure presenter: title, desc,
  phases/stages, paid badge/price, buy/continue/details button. Takes
  `program/meta/enrolled/locale`.
- `src/app/courses-app/account/page.tsx` — lists `user.purchases` only; already
  renders a per-course progress bar (from the Pro UX round). Empty for admin.
- `src/utilities/courseProgress.ts` — `getCompletedLessonIds`, `progressFor`,
  `firstIncompleteLesson`, `isEnrolled` (reuse).
- `src/collections/Program/index.ts` — no `featured` field yet.
- `src/app/courses-app/course-theme.css` — `.side { position: sticky; top:
  var(--nav-h); height: calc(100dvh - var(--nav-h)); overflow: hidden }`,
  `.navwrap { height:100%; display:flex; flex-direction:column }`, `.navlist {
  flex:1; overflow-y:auto }`. **Missing `min-height:0` on the flex children** →
  `.navlist` won't shrink below content, so it overflows/clips instead of
  scrolling (the bug).
- External programs API: `src/app/(frontend)/api/external/programs/*` forwards an
  allowlist of fields to `payload.create`/`update`.

## Architecture

### A. Storefront (`page.tsx` + `CourseCard` + helpers)
- **Pure helpers** (`src/utilities/courseProgress.ts`, TDD):
  - `courseStatus(done: number, total: number): 'new' | 'in-progress' | 'completed'`.
  - `compareForStorefront(a, b)` — a comparator over `{ featured, status, publishedAt }`
    implementing featured→in-progress→completed→new with `publishedAt` desc
    secondary. Expose as `storefrontSortKey(item)` (a tuple) or a comparator;
    plan picks one and TDDs the ordering.
- **`page.tsx`**: fetch all paid+published courses (`limit: 100`, no DB page).
  Build `lessonsByProgram` (already does). For a logged-in user, query
  `lesson-progress` where `user=user.id AND program in ids` → `doneByProgram`
  (count per program). Compute `status` + `pct` per course; sort with the
  comparator; slice to the current page (in-memory) and pass `totalPages` to
  `Pagination`.
- **`CourseCard`**: new optional props `status?: 'new'|'in-progress'|'completed'`,
  `pct?: number`, `featured?: boolean`. Render a status chip — in-progress shows
  a mini progress bar + `pct%`, completed shows "Ukończony ✓", featured shows a
  "Polecany" badge. The buy/continue/details control is unchanged. No status chip
  for logged-out viewers (status undefined).

### B. Account (`account/page.tsx`)
- Build the set: `purchasedIds` (existing) ∪ `progressProgramIds` (distinct
  `program` from the user's `lesson-progress` rows). Fetch those programs
  (`id in union`). For each, compute `progressFor(total, done)` (the existing
  per-course lessons query) + `firstIncompleteLesson` for the resume link. Sort:
  in-progress → completed → not-started (purchased-but-unstarted). Render the
  existing card + progress bar; "not started" shows 0%.

### C. Sidebar scroll (`course-theme.css`)
- Add `min-height: 0` to `.navwrap` and `.navlist` (the flex column + the
  scrolling child) so `.navlist { flex:1; overflow-y:auto }` actually scrolls
  inside the height-capped `.side` instead of overflowing. Optionally
  `align-self: start` on `.side` for grid-item sticky robustness. Verify the
  mobile `<details>` (`max-height:50vh`) path still scrolls.

### Schema — `featured`
- `src/collections/Program/index.ts`: add `{ name: 'featured', type: 'checkbox',
  defaultValue: false, label: 'Polecany (przypięty na górze listy kursów)',
  admin: { position: 'sidebar' } }`. `pnpm generate:types` + additive migration
  `program_featured`. Wire `featured` into the external programs POST/PATCH
  field allowlist (so it's settable via the content API).

## i18n (pl + en parity)
New keys: `courses.store.statusInProgress` ("W trakcie"), `courses.store.statusCompleted`
("Ukończony"), `courses.store.statusNew` ("Nowy"), `courses.store.featured`
("Polecany"). Reuse existing account/progress keys where possible.

## Testing
- **TDD (pure):** `courseStatus` (new/in-progress/completed incl. total=0 → new),
  the storefront comparator/sort-key (featured pin, status order, publishedAt
  secondary, logged-out all-new stable).
- **Build + smoke:** storefront 200 (logged-out: featured first); account 200;
  lesson page 307 unauth. The progress-sorted + status-badge views and the
  sidebar scroll are verified live (logged-in) — note as a manual/owner check.
- **Migration smoke:** `program_featured` additive, applies on dev DB; types
  regenerated. External API: a PATCH with `featured:true` round-trips.

## Global constraints (bind every task)
- **Schema only via migrations** (`push:false` stays). `pnpm payload
  migrate:create program_featured`; dev DB already up on `localhost:5436` (use
  `.env` `DATABASE_URI`, don't hardcode). Migration additive, prod applies on
  boot (fail-fast `npx payload migrate && node server.js`).
- **Never `git add -A`** — stage explicit paths; repo root has pre-existing
  untracked files + a stray `src/migrations/20260618_200715_program_price.json`
  that must never be committed (stage only THIS migration's new files by name).
- **i18n pl + en parity** (enforced by `src/i18n/translations.test.ts`).
- **Courses app is isolated** — style only in `course-theme.css`.
- **TDD for pure logic**; build + smoke for pages; migrate-smoke for the field.
  `pnpm test:int`, `pnpm build`.
- Deploy is owner-gated unless the user says otherwise; finish with a PR + runbook.
- Bash: don't end a command with `pkill`/`kill`; don't use `pkill -f 'next dev'`
  (matches its own command line → kills the shell). Stop background dev servers
  via the task stop mechanism / PID.
