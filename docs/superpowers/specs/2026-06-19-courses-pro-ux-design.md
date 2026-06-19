# Courses Pro UX — design

> **Date:** 2026-06-19. Approved via brainstorming. Branch `feat/courses-pro-ux`
> (from `main`). Goal: raise the courses lesson-reading experience and syllabus
> presentation to the level of the best text-first technical course platforms
> (Total TypeScript / Josh Comeau), plus tasteful progress tracking — **without
> touching routing/middleware and without restructuring the data model** beyond
> one additive collection.

## Scope (locked)

**In:**
- **A. Lesson reading page** — render the lesson prose body, 3-column layout
  (course nav | prose ≤68ch | sticky scroll-spy TOC), premium Shiki code blocks,
  anchored headings, calm dark reading surface, kill the video placeholder.
- **B. Progress tracking** — `LessonProgress` collection (1 additive migration),
  "mark complete & continue", sidebar checkmarks + per-phase counts, course
  progress bar, "continue where you left off".
- **C. Syllabus polish** — per-lesson time, total-scope line, resume CTA for the
  enrolled, per-phase progress.

**Out (deliberately, separate work):** preview lessons (free ungated reads),
quizzes/branching for `kind:'decision'`, notes/highlights, certificates, lesson
search, streaks/points/XP. Reading light-mode toggle is **not** added (the
courses app already has a global `.light` theme class; we tune the existing
tokens, we do not add a per-lesson reading toggle).

## Locked decisions

- **Reading surface:** keep the dark + gold brand. The lesson *prose panel* gets
  a calmer, less-glassy surface: a solid-ish dark background behind the text,
  high contrast, **no `backdrop-filter` blur behind long text** (glass stays on
  chrome/cards only). Gold stays for headings/links/accents. Tuned via existing
  dark/light tokens in `course-theme.css`.
- **Layout:** 3 columns — left `.side` course nav (existing, extended with
  progress), center prose at `max-width` ≈ 68ch / line-height 1.7, right sticky
  TOC. Collapses gracefully (TOC hides first, then sidebar stacks) at the
  existing breakpoints.
- **Progress model:** dedicated `LessonProgress` collection (pattern follows
  `ClaimGrants`): `user` (rel→users), `lesson` (rel→lessons), `program`
  (rel→program, denormalized for fast per-course counts), `completedAt` (date).
  **Compound unique index `(user, lesson)`** via the collection's `indexes`
  config → the migration emits a real DB unique index (atomic, no double rows).
  Access: `read` = own-or-admin, `create/update/delete` = admin-only; the server
  writes exclusively via the authenticated progress route (Local API,
  `overrideAccess`). No `push:true` — `pnpm payload migrate:create`.
- **Code highlighting:** `shiki` (build/runtime, zero client highlight JS).
  Theme `vesper` (warm gold-leaning dark) or `github-dark` — swappable, pick one
  in the plan. Transformers: `transformerNotationHighlight`,
  `transformerNotationDiff`, `transformerNotationFocus`. Filename/title bar +
  copy button (a tiny client island over server-rendered `<pre>`). A
  **module-level Shiki highlighter singleton** (created once, reused) avoids
  re-loading themes/langs per code block.
- **Fonts:** `next/font` in `courses-app/layout.tsx` — prose **Inter**, mono
  **JetBrains Mono** (swappable). Self-hosted, zero-CLS, exposed as CSS vars
  consumed by `course-theme.css` (`--font-ui`, `--font-mono`).

## Current state (grounding)

- `src/app/courses-app/_components/LessonView.tsx` — renders `why/what/dod` as
  plain-textarea paragraphs, a **video-or-striped-placeholder** block at the top,
  skills, dependencies, prev/next pager. **Never renders `lesson.content`.** No
  TOC, no progress.
- `src/app/courses-app/[slug]/learn/[lesson]/page.tsx` — gate (auth + enrolled or
  admin), fetches `program`, the `lesson` (depth 1), and `allLessons` (sort
  `nr`). `export const dynamic = 'force-dynamic'`.
- `src/components/RichText/index.tsx` — wraps `@payloadcms/richtext-lexical/react`
  `RichText` with a `jsxConverters` function (`defaultConverters` + `blocks`
  map). `CourseRichText` calls `<RichText data enableGutter={false}
  enableProse={false} />` inside `.course-prose` (the pattern we reuse).
- `src/collections/Lessons/index.ts` — has `content` (richText, localized),
  `estTimeMin {min,max}`, `why/what/dod` (textarea), `skills[]`, `dependencies`,
  `hardGate`, `hybrid`, `kind`, `youtubeEmbedUrl`, `nr`, `phaseId`.
- `src/collections/ClaimGrants.ts` — the marker-collection pattern to mirror.
- `src/app/(frontend)/api/courses/checkout/route.ts` — the auth+payload route
  shape to mirror for the progress route.
- `src/payload.config.ts` — `collections:` array (register `LessonProgress`
  near `ClaimGrants`).

## Architecture

### A. Lesson reading page

New/changed components under `src/app/courses-app/_components/`:

- **`CourseLessonProse.tsx`** — renders `lesson.content` via a courses-specific
  RichText invocation. Extends the existing `jsxConverters` with:
  - a **heading converter** (h2/h3): wraps the heading with a slugified `id` and
    a hover-revealed `#` anchor. Slug via a shared `slugify`.
  - a **code converter**: returns an async server component `<ShikiCode
    code lang meta />` that awaits the singleton highlighter. The exact code node
    type in the lesson editor (default lexical code node vs. the `Code` block)
    is confirmed during recon; both route to `ShikiCode`.
  Wrapped in `.course-prose` capped at the reading measure.
- **`ShikiCode.tsx`** (server) + **`CopyButton.tsx`** (client island) — Shiki
  HTML with title bar + copy.
- **`TableOfContents.tsx`** (client) — receives `{id,text,level}[]`; renders the
  right rail; IntersectionObserver scroll-spy sets the active heading; click =
  anchor scroll. Hidden when there are 0 headings or on narrow screens.
- **`LessonSidebar.tsx`** — extracted from `LessonView`; per-phase lesson nav +
  **completion checkmarks**, per-phase `done/total`, and a course progress bar.
- **`MarkCompleteButton.tsx`** (client island) — posts to the progress route,
  optimistic toggle, then `router.push(next)` on complete.
- **`extractHeadings.ts`** + **`slugify.ts`** (server utils) — walk the Lexical
  JSON root for h2/h3 → `{id,text,level}[]`; `slugify` shared with the heading
  converter so ids match the TOC.

`LessonView.tsx` is restructured to the new reading flow (each metadata block
still conditional):

1. breadcrumb (kept)
2. header: title + meta row (phase/stage · **~time** from `estTimeMin` · badges)
3. `why` as a short lead intro
4. optional inline video — **only when `youtubeEmbedUrl` is set** (placeholder
   removed entirely)
5. **main: `lesson.content` prose** (Shiki, anchored headings) — the centerpiece
6. `what` as a task section (kept, restyled)
7. `dod` as a closing checklist callout (kept)
8. skills chips, dependencies (kept)
9. **MarkCompleteButton** ("✓ Ukończ i dalej →")
10. prev/next pager (kept)

Right rail = `TableOfContents` (built from the `lesson.content` headings). When
`content` is empty the page still reads as complete (metadata-only), TOC hidden.

The lesson page (`page.tsx`) additionally queries the user's completed-lesson ids
for this program and passes them down (sidebar checkmarks + button initial
state).

### B. Progress tracking

- **`src/collections/LessonProgress.ts`** — fields + compound unique index as in
  Locked decisions. Registered in `payload.config.ts`. `pnpm generate:types` +
  `pnpm payload migrate:create lesson_progress` (additive: one table + unique
  index). Apply locally against the dev DB.
- **`src/app/(frontend)/api/courses/progress/route.ts`** (`POST`) — body
  `{ lessonId:number, completed:boolean }`. Steps:
  1. `payload.auth({ headers })` → 401 if no user.
  2. Load the lesson (`overrideAccess:true`, depth 0) → its `program`. 404 if
     missing.
  3. **Enrollment check** (defense in depth): admin OR `program ∈ user.purchases`
     → 403 otherwise. The client is never trusted to record progress for a course
     it doesn't own.
  4. Upsert: find `LessonProgress` where `user=user.id AND lesson=lessonId`.
     `completed && !exists` → create (`completedAt=now`); `!completed && exists`
     → delete. Idempotent. Catch the unique-index race on concurrent creates and
     treat as already-complete.
  5. Return `{ completed, completedCount, total }` for optimistic UI sync.
- **Progress helpers** (`src/utilities/courseProgress.ts`):
  - `getCompletedLessonIds(payload, userId, programId): Promise<Set<number>>`.
  - `firstIncompleteLesson(sortedLessons, completedIds): Lesson | null` — for the
    resume target (first by `nr` not completed; null when all done).
  - `progressFor(sortedLessons, completedIds)` → `{ done, total, pct }` and per
    phase. Pure functions → TDD.

### C. Syllabus polish

- **`Curriculum.tsx`** — per-lesson time range from `estTimeMin` in each row;
  total-scope line in the header ("N faz · M lekcji · ~Hh"); when the viewer is
  enrolled, per-phase `done/total` + a course progress bar.
- **`SyllabusHero.tsx`** — for the enrolled, the primary CTA becomes
  **"Wróć do nauki"** deep-linking to `firstIncompleteLesson` (or "Zacznij"
  → first lesson when nothing is done; "Ukończono ✓" when all done).
- **`account/page.tsx`** — each purchased-course card shows a small progress bar
  + a "Wróć do nauki" link to its first incomplete lesson.

The syllabus page (`[slug]/page.tsx`) gains an optional progress fetch: only when
a user is logged in and enrolled (it stays public/marketing otherwise).

## Typography & reading surface (CSS, `course-theme.css`)

- New `.course-prose` reading rules: `max-width: 68ch`, `line-height: 1.7`, a
  codified type scale (h1 ≈ 2×, h2 ≈ 1.5×, h3 ≈ 1.25× body; more space above a
  heading than below), `16–18px` body. Headings get scroll-margin-top for anchor
  jumps and a hover `#` affordance.
- A calm `.lprose`/reading-surface treatment: solid-ish dark bg, no blur behind
  the long text, high contrast. Code blocks may bleed slightly wider than prose.
- Shiki `<pre>` styling: title bar, copy button, line-highlight/diff/focus
  classes from the transformers.
- TOC styling (`.lesson-toc`): sticky, muted until active, gold active item.
- Progress UI: `.progressbar`, sidebar `.navitem.done` (check + dimmed), phase
  `done/total` chip.
- Fonts wired through `--font-ui` (Inter) / `--font-mono` (JetBrains Mono).

## i18n

New `t()` keys (pl + en parity, in the courses namespace): mark-complete,
continue, completed, `done/total`, "na tej stronie" (TOC), resume / "wróć do
nauki" / "zacznij" / "ukończono", reading-time format. Existing keys reused
where possible.

## Security notes

- The progress route is the only writer; it **re-checks enrollment server-side**
  before recording — a scripted POST can't mark progress (or read others') for a
  course the caller doesn't own.
- `LessonProgress.read` is own-or-admin; writes are admin-only at the collection
  level and happen via the route's Local API `overrideAccess`.
- The compound unique `(user, lesson)` index is the atomic guard against double
  rows under concurrent requests.
- No change to the lesson content gate (`auth` + enrolled-or-admin) — progress is
  strictly additive to the existing access model.

## Testing

- **TDD (pure logic):** `slugify` (stable, collision-tolerant, diacritics),
  `extractHeadings` (h2/h3 only, nested text, empty → []), `progressFor` /
  `firstIncompleteLesson` (none done, some done, all done, gaps in `nr`).
- **TDD (route):** progress POST — 401 unauth; 403 not-enrolled; 404 unknown
  lesson; complete creates one row + returns counts; un-complete deletes; double
  complete is idempotent (unique-index race handled).
- **Build + smoke:** lesson page 200 (renders prose + TOC + mark-complete),
  syllabus 200 (time + resume + progress), account 200. `ShikiCode` renders
  highlighted HTML.
- **Migration smoke:** `LessonProgress` migration applies cleanly on the dev DB;
  `payload-types` regenerated.

## Global constraints (bind every task)

- **Schema only via migrations** (`push:false` stays). Each model change =
  `DATABASE_URI=<dev> pnpm payload migrate:create <name>` + commit. Never restore
  `push:true`.
- **Do NOT deploy / push to `main` / touch prod** (Coolify/SSH/prod migrations).
  Branch `feat/courses-pro-ux`; finish with a PR + deploy runbook (migrate +
  reconcile, mirroring the courses runbook). Owner runs deploy.
- **Never `git add -A`** — the repo root has pre-existing untracked files
  (`COurses-handoff/`, `content/`, `*.md`, `scripts/*.sql`, migration `.json`)
  that must not be committed. Stage explicit paths only.
- **i18n pl + en parity** for every new user-facing string.
- **Courses app is isolated** — style only via `course-theme.css`; do not let
  main-site Tailwind `prose` bleed into the lesson body (keep `enableProse:false`
  / `enableGutter:false`).
- **TDD for logic**, build + smoke for pages/route, migrate-smoke for the
  collection. `pnpm test:int`, `pnpm build`.
- Bash: don't end commands with `pkill`/`kill` (exit 144 kills the shell).
