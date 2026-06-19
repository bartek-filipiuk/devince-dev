# Courses Pro UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the courses lesson-reading experience to the level of the best text-first technical course platforms (render the lesson prose body, premium Shiki code blocks, sticky scroll-spy TOC, calm dark reading surface) and add tasteful progress tracking (mark-complete, sidebar checkmarks, progress bars, "resume").

**Architecture:** Additive only. One new Payload collection (`LessonProgress`) behind one migration; one new POST route (`/api/courses/progress`); a courses-specific Lexical renderer (`CourseLessonProse`) that overrides the heading + code-block converters (Shiki, anchored ids) without touching the main-site `RichText`; pure helper utils (TDD) for slugs, heading extraction, and progress math; restructured `LessonView` + syllabus components; a CSS/typography pass in the isolated `course-theme.css`. No routing/middleware changes.

**Tech Stack:** Next.js 15 App Router (RSC), Payload CMS 3.67, PostgreSQL, `@payloadcms/richtext-lexical` (Lexical), `shiki` + `@shikijs/transformers`, `next/font`, vitest (`pnpm test:int`), TypeScript.

## Global Constraints

- **Schema only via migrations** (`push:false` stays). Each model change = `pnpm payload migrate:create <name>` against the running dev DB (`docker compose up -d`, Postgres :5433) + commit the migration. Never restore `push:true`.
- **Do NOT deploy / push to `main` / touch prod** (no Coolify/SSH/prod migrations). Work on branch `feat/courses-pro-ux`; finish with a PR + deploy runbook. Owner runs deploy.
- **Never `git add -A`.** The repo root has pre-existing untracked files (`COurses-handoff/`, `content/`, `*.md`, `scripts/*.sql`, `src/migrations/*program_price.json`) that must not be committed. Stage explicit paths only.
- **i18n pl + en parity** for every new user-facing string (enforced by `src/i18n/translations.test.ts`).
- **Courses app is isolated** — style only via `src/app/courses-app/course-theme.css`; never let main-site Tailwind `prose` bleed into the lesson body.
- **TDD for pure logic**; build + smoke for pages/components; dev-server smoke + migrate-smoke for the route/collection. `pnpm test:int`, `pnpm build`.
- Bash: do NOT end a command with `pkill`/`kill` (exit 144 kills the shell). Leave the dev server running or stop it in a separate command.
- Tests are colocated `*.test.ts` next to source, run with `cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.config.mts` (= `pnpm test:int`).
- After any collection/field change: `pnpm generate:types` (updates `src/payload-types.ts`).

---

## File Structure

**New (created):**
- `src/utilities/shikiHighlighter.ts` — singleton Shiki highlighter + `highlightCode()`.
- `src/utilities/slugify.ts` — `slugify()` + `uniqueSlug()` (Polish-diacritic aware, dedup).
- `src/utilities/lessonHeadings.ts` — `extractHeadings()` (Lexical JSON → `{id,text,level}[]`).
- `src/utilities/courseProgress.ts` — pure: `isEnrolled()`, `countCompleted()`, `phaseProgress()`, `progressFor()`, `firstIncompleteLesson()`; + DB helper `getCompletedLessonIds()`.
- `src/collections/LessonProgress.ts` — the progress collection.
- `src/app/(frontend)/api/courses/progress/route.ts` — POST upsert/delete.
- `src/app/courses-app/_components/ShikiCode.tsx` — server: Shiki `<pre>` + title bar + copy.
- `src/app/courses-app/_components/CopyButton.tsx` — client copy island.
- `src/app/courses-app/_components/CourseLessonProse.tsx` — server: lesson `content` renderer.
- `src/app/courses-app/_components/TableOfContents.tsx` — client: scroll-spy TOC.
- `src/app/courses-app/_components/LessonSidebar.tsx` — extracted sidebar + progress.
- `src/app/courses-app/_components/MarkCompleteButton.tsx` — client: mark-complete & continue.
- Migration under `src/migrations/` (generated).
- Test files colocated: `shikiHighlighter.test.ts`, `slugify.test.ts`, `lessonHeadings.test.ts`, `courseProgress.test.ts`.

**Modified:**
- `src/payload.config.ts` — register `LessonProgress`.
- `src/i18n/translations.ts` — new courses keys (pl+en).
- `src/app/courses-app/_components/LessonView.tsx` — restructure (prose-first, kill placeholder, mount sidebar/TOC/mark-complete).
- `src/app/courses-app/[slug]/learn/[lesson]/page.tsx` — fetch completed ids + headings, pass down.
- `src/app/courses-app/[slug]/page.tsx` — fetch progress (enrolled), pass to Curriculum/Hero.
- `src/app/courses-app/_components/Curriculum.tsx` — per-lesson time, total scope, per-phase progress.
- `src/app/courses-app/_components/SyllabusHero.tsx` — resume CTA + course progress.
- `src/app/courses-app/account/page.tsx` — per-course progress bar + resume.
- `src/app/courses-app/layout.tsx` — `next/font` (Inter, JetBrains Mono) → CSS vars.
- `src/app/courses-app/course-theme.css` — fonts, `.course-prose` measure/scale, reading surface, Shiki `<pre>`, `.lesson-toc`, progress UI.

---

## Task 1: Shiki highlighter (singleton + highlightCode)

**Files:**
- Create: `src/utilities/shikiHighlighter.ts`
- Test: `src/utilities/shikiHighlighter.test.ts`

**Interfaces:**
- Produces: `highlightCode(code: string, lang?: string): Promise<string>` — returns Shiki HTML (`<pre class="shiki …">…</pre>`); unknown/empty language falls back to plaintext.

- [ ] **Step 1: Add the dependency**

```bash
pnpm add shiki @shikijs/transformers
```

- [ ] **Step 2: Write the failing test**

`src/utilities/shikiHighlighter.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { highlightCode } from './shikiHighlighter'

describe('highlightCode', () => {
  it('wraps code in a shiki <pre> and keeps the source text', async () => {
    const html = await highlightCode('const a = 1', 'typescript')
    expect(html).toContain('<pre')
    expect(html).toContain('shiki')
    expect(html).toContain('a')
  }, 20000)

  it('falls back to plaintext for an unknown language', async () => {
    const html = await highlightCode('hello world', 'not-a-real-lang')
    expect(html).toContain('<pre')
    expect(html).toContain('hello world')
  }, 20000)
})
```

- [ ] **Step 3: Run it — verify it fails**

Run: `pnpm test:int src/utilities/shikiHighlighter.test.ts`
Expected: FAIL (`highlightCode` not found / module missing).

- [ ] **Step 4: Implement**

`src/utilities/shikiHighlighter.ts`:
```ts
import {
  createHighlighter,
  type Highlighter,
  type BundledLanguage,
} from 'shiki'
import {
  transformerNotationHighlight,
  transformerNotationDiff,
  transformerNotationFocus,
} from '@shikijs/transformers'

// Theme decision: `github-dark` (built-in, warm dark, pairs with the gold
// accents). Swappable in one place.
const THEME = 'github-dark'
// Languages the lesson CodeBlock select offers (+ a few common extras).
const LANGS: BundledLanguage[] = [
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'python',
  'bash',
  'json',
  'css',
  'html',
  'php',
  'sql',
  'markdown',
]

// Module-level singleton: createHighlighter loads the wasm + themes/langs once
// and is reused for every code block across every request.
let highlighterPromise: Promise<Highlighter> | null = null
function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({ themes: [THEME], langs: LANGS })
  }
  return highlighterPromise
}

export async function highlightCode(code: string, lang?: string): Promise<string> {
  const hl = await getHighlighter()
  const loaded = hl.getLoadedLanguages()
  const language = lang && loaded.includes(lang) ? lang : 'text'
  return hl.codeToHtml(code, {
    lang: language,
    theme: THEME,
    transformers: [
      transformerNotationHighlight(),
      transformerNotationDiff(),
      transformerNotationFocus(),
    ],
  })
}
```

- [ ] **Step 5: Run the test — verify it passes**

Run: `pnpm test:int src/utilities/shikiHighlighter.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/utilities/shikiHighlighter.ts src/utilities/shikiHighlighter.test.ts package.json pnpm-lock.yaml
git commit -m "feat(courses): shiki highlighter singleton for lesson code blocks"
```

---

## Task 2: Heading utilities (slugify + extractHeadings)

**Files:**
- Create: `src/utilities/slugify.ts`, `src/utilities/lessonHeadings.ts`
- Test: `src/utilities/slugify.test.ts`, `src/utilities/lessonHeadings.test.ts`

**Interfaces:**
- Produces:
  - `slugify(text: string): string` — lowercase, Polish-diacritic-folded, `-`-joined.
  - `uniqueSlug(text: string, seen: Map<string, number>): string` — `slugify` + dedup suffix (`-1`, `-2`) using the caller's `seen` map.
  - `extractHeadings(content: unknown): Array<{ id: string; text: string; level: 2 | 3 }>` — h2/h3 only, in document order, ids deduped via `uniqueSlug`. **The TOC and the prose renderer both build ids with `uniqueSlug` over the same h2/h3 sequence, so ids match.**

- [ ] **Step 1: Write the failing slugify test**

`src/utilities/slugify.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { slugify, uniqueSlug } from './slugify'

describe('slugify', () => {
  it('lowercases and dash-joins', () => {
    expect(slugify('Krok 1: Konfiguracja')).toBe('krok-1-konfiguracja')
  })
  it('folds Polish diacritics', () => {
    expect(slugify('Zażółć gęślą jaźń')).toBe('zazolc-gesla-jazn')
    expect(slugify('Łatwy start')).toBe('latwy-start')
  })
  it('trims stray dashes and symbols', () => {
    expect(slugify('  —Hello, World!— ')).toBe('hello-world')
  })
})

describe('uniqueSlug', () => {
  it('suffixes repeats using the seen map', () => {
    const seen = new Map<string, number>()
    expect(uniqueSlug('Setup', seen)).toBe('setup')
    expect(uniqueSlug('Setup', seen)).toBe('setup-1')
    expect(uniqueSlug('Setup', seen)).toBe('setup-2')
  })
})
```

- [ ] **Step 2: Run it — verify it fails**

Run: `pnpm test:int src/utilities/slugify.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement slugify**

`src/utilities/slugify.ts`:
```ts
/** URL-safe slug. Folds Polish ł/Ł explicitly (NFKD leaves them intact). */
export function slugify(text: string): string {
  return text
    .toString()
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** slugify + a `-N` suffix on repeats, tracked in the caller's `seen` map. */
export function uniqueSlug(text: string, seen: Map<string, number>): string {
  const base = slugify(text)
  const n = seen.get(base) ?? 0
  seen.set(base, n + 1)
  return n > 0 ? `${base}-${n}` : base
}
```

- [ ] **Step 4: Run slugify test — verify it passes**

Run: `pnpm test:int src/utilities/slugify.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing extractHeadings test**

`src/utilities/lessonHeadings.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { extractHeadings } from './lessonHeadings'

const doc = (children: any[]) => ({ root: { type: 'root', children } })
const heading = (tag: string, text: string) => ({
  type: 'heading',
  tag,
  children: [{ type: 'text', text }],
})

describe('extractHeadings', () => {
  it('returns h2/h3 in order with slug ids and levels', () => {
    const content = doc([
      heading('h2', 'Wprowadzenie'),
      { type: 'paragraph', children: [{ type: 'text', text: 'x' }] },
      heading('h3', 'Krok 1'),
      heading('h4', 'Pominąć'),
    ])
    expect(extractHeadings(content)).toEqual([
      { id: 'wprowadzenie', text: 'Wprowadzenie', level: 2 },
      { id: 'krok-1', text: 'Krok 1', level: 3 },
    ])
  })
  it('dedupes repeated heading text', () => {
    const content = doc([heading('h2', 'Setup'), heading('h2', 'Setup')])
    expect(extractHeadings(content).map((h) => h.id)).toEqual(['setup', 'setup-1'])
  })
  it('handles missing/empty content', () => {
    expect(extractHeadings(undefined)).toEqual([])
    expect(extractHeadings(doc([]))).toEqual([])
  })
})
```

- [ ] **Step 6: Run it — verify it fails**

Run: `pnpm test:int src/utilities/lessonHeadings.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 7: Implement extractHeadings**

`src/utilities/lessonHeadings.ts`:
```ts
import { uniqueSlug } from './slugify'

export type LessonHeading = { id: string; text: string; level: 2 | 3 }

function nodeText(node: any): string {
  if (!node) return ''
  if (typeof node.text === 'string') return node.text
  if (Array.isArray(node.children)) return node.children.map(nodeText).join('')
  return ''
}

/** Walks a Lexical editor state's top-level children for h2/h3 headings. */
export function extractHeadings(content: unknown): LessonHeading[] {
  const root = (content as any)?.root
  const children: any[] = Array.isArray(root?.children) ? root.children : []
  const out: LessonHeading[] = []
  const seen = new Map<string, number>()
  for (const node of children) {
    if (node?.type !== 'heading') continue
    if (node.tag !== 'h2' && node.tag !== 'h3') continue
    const text = nodeText(node).trim()
    if (!text) continue
    out.push({ id: uniqueSlug(text, seen), text, level: node.tag === 'h2' ? 2 : 3 })
  }
  return out
}
```

- [ ] **Step 8: Run extractHeadings test — verify it passes**

Run: `pnpm test:int src/utilities/lessonHeadings.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/utilities/slugify.ts src/utilities/slugify.test.ts src/utilities/lessonHeadings.ts src/utilities/lessonHeadings.test.ts
git commit -m "feat(courses): slugify + lesson heading extraction (anchors + TOC)"
```

---

## Task 3: Progress math (pure helpers)

**Files:**
- Create: `src/utilities/courseProgress.ts`
- Test: `src/utilities/courseProgress.test.ts`

**Interfaces:**
- Produces (pure):
  - `isEnrolled(user, programId: number): boolean` — admin role OR `programId ∈ user.purchases`.
  - `countCompleted(lessons, completed: Set<number>): number`.
  - `phaseProgress(lessons, completed): Map<string, { done: number; total: number }>` (keyed by `phaseId`).
  - `progressFor(total: number, done: number): { done: number; total: number; pct: number }` (pct rounded 0–100).
  - `firstIncompleteLesson(sortedLessons, completed): T | null`.
- Produces (DB, not unit-tested): `getCompletedLessonIds(payload, userId, programId): Promise<Set<number>>` — added in Task 5 (needs the collection).

- [ ] **Step 1: Write the failing test**

`src/utilities/courseProgress.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  isEnrolled,
  countCompleted,
  phaseProgress,
  progressFor,
  firstIncompleteLesson,
} from './courseProgress'

const lessons = [
  { id: 1, nr: 1, phaseId: 'A' },
  { id: 2, nr: 2, phaseId: 'A' },
  { id: 3, nr: 3, phaseId: 'B' },
] as any

describe('isEnrolled', () => {
  it('false without a user', () => {
    expect(isEnrolled(null, 5)).toBe(false)
  })
  it('true for admins', () => {
    expect(isEnrolled({ roles: ['admin'], purchases: [] } as any, 5)).toBe(true)
  })
  it('true when the program is purchased (id or populated object)', () => {
    expect(isEnrolled({ roles: ['customer'], purchases: [5] } as any, 5)).toBe(true)
    expect(isEnrolled({ roles: ['customer'], purchases: [{ id: 5 }] } as any, 5)).toBe(true)
    expect(isEnrolled({ roles: ['customer'], purchases: [{ id: 9 }] } as any, 5)).toBe(false)
  })
})

describe('progress math', () => {
  it('counts completed', () => {
    expect(countCompleted(lessons, new Set([1, 3]))).toBe(2)
  })
  it('computes per-phase done/total', () => {
    const m = phaseProgress(lessons, new Set([1]))
    expect(m.get('A')).toEqual({ done: 1, total: 2 })
    expect(m.get('B')).toEqual({ done: 0, total: 1 })
  })
  it('computes pct', () => {
    expect(progressFor(4, 1)).toEqual({ done: 1, total: 4, pct: 25 })
    expect(progressFor(0, 0)).toEqual({ done: 0, total: 0, pct: 0 })
  })
  it('finds the first incomplete by order', () => {
    expect(firstIncompleteLesson(lessons, new Set([1]))?.id).toBe(2)
    expect(firstIncompleteLesson(lessons, new Set([1, 2, 3]))).toBeNull()
  })
})
```

- [ ] **Step 2: Run it — verify it fails**

Run: `pnpm test:int src/utilities/courseProgress.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the pure helpers**

`src/utilities/courseProgress.ts`:
```ts
type UserLike = {
  roles?: (string | null)[] | null
  purchases?: (number | { id: number } | null)[] | null
} | null | undefined

/** Admin OR the program is in the user's purchases. Mirrors the syllabus gate. */
export function isEnrolled(user: UserLike, programId: number): boolean {
  if (!user) return false
  if ((user.roles ?? []).includes('admin')) return true
  return (user.purchases ?? []).some(
    (p) => (typeof p === 'object' && p ? p.id : p) === programId,
  )
}

export function countCompleted<T extends { id: number }>(
  lessons: T[],
  completed: Set<number>,
): number {
  return lessons.reduce((a, l) => a + (completed.has(l.id) ? 1 : 0), 0)
}

export function phaseProgress<T extends { id: number; phaseId?: string | null }>(
  lessons: T[],
  completed: Set<number>,
): Map<string, { done: number; total: number }> {
  const m = new Map<string, { done: number; total: number }>()
  for (const l of lessons) {
    if (!l.phaseId) continue
    const cur = m.get(l.phaseId) ?? { done: 0, total: 0 }
    cur.total++
    if (completed.has(l.id)) cur.done++
    m.set(l.phaseId, cur)
  }
  return m
}

export function progressFor(
  total: number,
  done: number,
): { done: number; total: number; pct: number } {
  const d = Math.min(Math.max(done, 0), total)
  return { done: d, total, pct: total > 0 ? Math.round((d / total) * 100) : 0 }
}

export function firstIncompleteLesson<T extends { id: number }>(
  sortedLessons: T[],
  completed: Set<number>,
): T | null {
  for (const l of sortedLessons) if (!completed.has(l.id)) return l
  return null
}
```

- [ ] **Step 4: Run the test — verify it passes**

Run: `pnpm test:int src/utilities/courseProgress.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utilities/courseProgress.ts src/utilities/courseProgress.test.ts
git commit -m "feat(courses): pure progress helpers (enrolment, per-phase, resume)"
```

---

## Task 4: LessonProgress collection + migration

**Files:**
- Create: `src/collections/LessonProgress.ts`
- Modify: `src/payload.config.ts` (import + register near `ClaimGrants`)
- Generated: `src/migrations/<timestamp>_lesson_progress.ts` (+ `.json`)

**Interfaces:**
- Produces: a `lesson-progress` collection — fields `user`(rel→users), `lesson`(rel→lessons), `program`(rel→program), `completedAt`(date); compound **unique index `(user, lesson)`**; read = own-or-admin, writes admin-only (server writes via `overrideAccess`).

- [ ] **Step 1: Create the collection**

`src/collections/LessonProgress.ts`:
```ts
import type { Access, CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'

// A signed-in user may read only their own rows; admins read all. Writes happen
// exclusively through the authenticated progress route via the Local API
// (overrideAccess), so create/update/delete are admin-only at the collection.
const ownOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if ((user.roles ?? []).includes('admin')) return true
  return { user: { equals: user.id } }
}

export const LessonProgress: CollectionConfig = {
  slug: 'lesson-progress',
  access: { read: ownOrAdmin, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'lesson', 'program', 'completedAt'],
  },
  // Compound unique index → atomic single-row-per-(user,lesson); the route
  // catches the unique violation on a concurrent double-complete.
  indexes: [{ fields: ['user', 'lesson'], unique: true }],
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'lesson', type: 'relationship', relationTo: 'lessons', required: true },
    { name: 'program', type: 'relationship', relationTo: 'program', required: true, index: true },
    { name: 'completedAt', type: 'date' },
  ],
}
```

- [ ] **Step 2: Register in payload.config**

In `src/payload.config.ts`, add the import next to the other collection imports (near line 9, by `ClaimGrants`):
```ts
import { LessonProgress } from './collections/LessonProgress'
```
And add `LessonProgress,` to the `collections: [ … ]` array (line ~91), right after `ClaimGrants,`:
```ts
    DownloadGrants,
    ClaimGrants,
    LessonProgress,
```

- [ ] **Step 3: Regenerate types**

Run: `pnpm generate:types`
Expected: `src/payload-types.ts` now contains a `LessonProgress` interface and `'lesson-progress'` in the collections map. No errors.

- [ ] **Step 4: Ensure the dev DB is up**

Run: `docker compose up -d`
Expected: Postgres container running on :5433 (idempotent if already up).

- [ ] **Step 5: Create the migration**

Run: `pnpm payload migrate:create lesson_progress`
Expected: a new file in `src/migrations/` whose `up` creates the `lesson_progress` table + the unique index on `(user_id, lesson_id)`. **Open the generated SQL and confirm it is additive (CREATE TABLE / CREATE UNIQUE INDEX only — no DROP/ALTER of existing tables).** If the diff touches anything other than the new table/indexes, stop and investigate (do not apply).

- [ ] **Step 6: Apply the migration locally**

Run: `pnpm payload migrate`
Expected: the `lesson_progress` migration applies cleanly; table exists.

- [ ] **Step 7: Commit**

```bash
git add src/collections/LessonProgress.ts src/payload.config.ts src/payload-types.ts src/migrations/
git commit -m "feat(courses): LessonProgress collection + migration (unique user×lesson)"
```

---

## Task 5: Progress route + getCompletedLessonIds

**Files:**
- Create: `src/app/(frontend)/api/courses/progress/route.ts`
- Modify: `src/utilities/courseProgress.ts` (add the DB helper)

**Interfaces:**
- Consumes: `isEnrolled` (Task 3), `lesson-progress` collection (Task 4).
- Produces:
  - `POST /api/courses/progress` body `{ lessonId: number, completed: boolean }` → `200 { completed, completedCount, total }`; `400` bad body; `401` unauth; `403` not enrolled; `404` unknown lesson. Idempotent.
  - `getCompletedLessonIds(payload, userId, programId): Promise<Set<number>>`.

- [ ] **Step 1: Add the DB helper**

Append to `src/utilities/courseProgress.ts`:
```ts
import type { Payload } from 'payload'

/** Lesson ids the user has completed in a program (server-side, overrideAccess). */
export async function getCompletedLessonIds(
  payload: Payload,
  userId: number,
  programId: number,
): Promise<Set<number>> {
  const res = await payload.find({
    collection: 'lesson-progress',
    where: { and: [{ user: { equals: userId } }, { program: { equals: programId } }] },
    limit: 0,
    overrideAccess: true,
    depth: 0,
  })
  return new Set(
    res.docs.map((d: any) => (typeof d.lesson === 'object' && d.lesson ? d.lesson.id : d.lesson)),
  )
}
```

- [ ] **Step 2: Create the route**

`src/app/(frontend)/api/courses/progress/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { isEnrolled } from '@/utilities/courseProgress'

export async function POST(req: NextRequest) {
  let lessonId: unknown
  let completed: unknown
  try {
    ;({ lessonId, completed } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  if (typeof lessonId !== 'number' || typeof completed !== 'boolean') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await nextHeaders() })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const lesson = await payload
    .findByID({ collection: 'lessons', id: lessonId, overrideAccess: true, depth: 0 })
    .catch(() => null)
  if (!lesson) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const programId =
    typeof lesson.program === 'object' && lesson.program ? lesson.program.id : (lesson.program as number)

  // Server-side trust boundary: never record progress for a course the caller
  // does not own.
  if (!isEnrolled(user, programId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const existing = await payload.find({
    collection: 'lesson-progress',
    where: { and: [{ user: { equals: user.id } }, { lesson: { equals: lessonId } }] },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })
  const row = existing.docs[0]

  if (completed && !row) {
    try {
      await payload.create({
        collection: 'lesson-progress',
        data: { user: user.id, lesson: lessonId, program: programId, completedAt: new Date().toISOString() },
        overrideAccess: true,
      })
    } catch {
      // Unique (user,lesson) race on a concurrent double-complete → already done.
    }
  } else if (!completed && row) {
    await payload.delete({ collection: 'lesson-progress', id: row.id, overrideAccess: true })
  }

  const all = await payload.find({
    collection: 'lesson-progress',
    where: { and: [{ user: { equals: user.id } }, { program: { equals: programId } }] },
    limit: 0,
    overrideAccess: true,
    depth: 0,
  })
  const total = await payload.find({
    collection: 'lessons',
    where: { program: { equals: programId } },
    limit: 0,
    overrideAccess: true,
    depth: 0,
  })

  return NextResponse.json({ completed, completedCount: all.totalDocs, total: total.totalDocs })
}
```

- [ ] **Step 3: Typecheck/build the route**

Run: `pnpm build`
Expected: build succeeds (route compiles; types from Task 4 resolve `'lesson-progress'`).

- [ ] **Step 4: Smoke the unauthenticated + bad-body paths**

Start the dev server in the background, then:
```bash
# (dev server: pnpm dev  → http://localhost:3010)
curl -s -o /dev/null -w "noauth=%{http_code}\n" -X POST http://localhost:3010/api/courses/progress \
  -H 'content-type: application/json' -d '{"lessonId":1,"completed":true}'
curl -s -o /dev/null -w "badbody=%{http_code}\n" -X POST http://localhost:3010/api/courses/progress \
  -H 'content-type: application/json' -d '{"lessonId":"x"}'
```
Expected: `noauth=401`, `badbody=400`. (The 200/403 paths require a session cookie and are exercised via the UI in Task 9's smoke as an admin/enrolled user.)

- [ ] **Step 5: Commit**

```bash
git add src/app/\(frontend\)/api/courses/progress/route.ts src/utilities/courseProgress.ts
git commit -m "feat(courses): POST /api/courses/progress (enrolment-gated upsert)"
```

---

## Task 6: i18n keys (pl + en)

**Files:**
- Modify: `src/i18n/translations.ts` (add keys to BOTH `pl` and `en` objects)

**Interfaces:**
- Produces these `TranslationKey`s (used by Tasks 7–11): `courses.lesson.onThisPage`, `courses.lesson.markComplete`, `courses.lesson.markCompleteLast`, `courses.lesson.completed`, `courses.lesson.undo`, `courses.lesson.next`Reading*, `courses.lesson.readMin`, `courses.lesson.copy`, `courses.lesson.copied`, `courses.progress.label`, `courses.progress.unit`, `courses.syllabus.resume`, `courses.syllabus.allDone`, `courses.syllabus.totalTimeUnit`, `courses.auth.resume`, `courses.auth.notStarted`.

- [ ] **Step 1: Add the keys to the `pl` block**

In `src/i18n/translations.ts`, inside the `pl: { … }` object, in the courses section, add:
```ts
    // Courses — pro UX (lesson reading + progress)
    'courses.lesson.onThisPage': 'Na tej stronie',
    'courses.lesson.markComplete': 'Ukończ i dalej',
    'courses.lesson.markCompleteLast': 'Oznacz jako ukończone',
    'courses.lesson.completed': 'Ukończono',
    'courses.lesson.undo': 'Odznacz',
    'courses.lesson.readMin': 'min czytania',
    'courses.lesson.copy': 'Kopiuj',
    'courses.lesson.copied': 'Skopiowano',
    'courses.progress.label': 'Postęp',
    'courses.progress.unit': 'lekcji',
    'courses.syllabus.resume': 'Wróć do nauki',
    'courses.syllabus.allDone': 'Ukończono kurs',
    'courses.syllabus.totalTimeUnit': 'h',
    'courses.auth.resume': 'Wróć do nauki',
    'courses.auth.notStarted': 'Rozpocznij',
```

- [ ] **Step 2: Add the matching keys to the `en` block**

In the `en: { … }` object, courses section, add:
```ts
    // Courses — pro UX (lesson reading + progress)
    'courses.lesson.onThisPage': 'On this page',
    'courses.lesson.markComplete': 'Complete & continue',
    'courses.lesson.markCompleteLast': 'Mark as complete',
    'courses.lesson.completed': 'Completed',
    'courses.lesson.undo': 'Mark as not done',
    'courses.lesson.readMin': 'min read',
    'courses.lesson.copy': 'Copy',
    'courses.lesson.copied': 'Copied',
    'courses.progress.label': 'Progress',
    'courses.progress.unit': 'lessons',
    'courses.syllabus.resume': 'Resume',
    'courses.syllabus.allDone': 'Course completed',
    'courses.syllabus.totalTimeUnit': 'h',
    'courses.auth.resume': 'Resume',
    'courses.auth.notStarted': 'Start',
```

- [ ] **Step 3: Run the parity test**

Run: `pnpm test:int src/i18n/translations.test.ts`
Expected: PASS (identical key sets, no empty values).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/translations.ts
git commit -m "i18n(courses): pro-UX keys (TOC, progress, mark-complete, resume) pl+en"
```

---

## Task 7: Lesson prose renderer (ShikiCode + CopyButton + CourseLessonProse)

**Files:**
- Create: `src/app/courses-app/_components/CopyButton.tsx`, `src/app/courses-app/_components/ShikiCode.tsx`, `src/app/courses-app/_components/CourseLessonProse.tsx`

**Interfaces:**
- Consumes: `highlightCode` (Task 1), `uniqueSlug` (Task 2), the `t` dictionary (Task 6).
- Produces: `<CourseLessonProse content={lesson.content} locale={locale} />` — renders the lesson Lexical body with Shiki code blocks and anchored h2/h3 ids that match `extractHeadings`.

- [ ] **Step 1: CopyButton (client)**

`src/app/courses-app/_components/CopyButton.tsx`:
```tsx
'use client'
import { useState } from 'react'

export function CopyButton({ code, copyLabel, copiedLabel }: {
  code: string
  copyLabel: string
  copiedLabel: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="lc__copy"
      aria-label={copyLabel}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          /* clipboard unavailable — no-op */
        }
      }}
    >
      {copied ? copiedLabel : copyLabel}
    </button>
  )
}
```

- [ ] **Step 2: ShikiCode (server)**

`src/app/courses-app/_components/ShikiCode.tsx`:
```tsx
import { highlightCode } from '@/utilities/shikiHighlighter'
import { t, type Locale } from '@/i18n'
import { CopyButton } from './CopyButton'

export async function ShikiCode({ code, lang, locale }: {
  code: string
  lang?: string
  locale: Locale
}) {
  const html = await highlightCode(code ?? '', lang)
  return (
    <figure className="lc not-prose">
      <figcaption className="lc__bar">
        <span className="lc__name">{lang ?? 'code'}</span>
        <CopyButton
          code={code ?? ''}
          copyLabel={t(locale, 'courses.lesson.copy')}
          copiedLabel={t(locale, 'courses.lesson.copied')}
        />
      </figcaption>
      <div className="lc__body" dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  )
}
```

- [ ] **Step 3: CourseLessonProse (server, custom converters)**

`src/app/courses-app/_components/CourseLessonProse.tsx`:
```tsx
import type { DefaultTypedEditorState, SerializedLinkNode } from '@payloadcms/richtext-lexical'
import {
  RichText as ConvertRichText,
  type JSXConvertersFunction,
  LinkJSXConverter,
} from '@payloadcms/richtext-lexical/react'
import { uniqueSlug } from '@/utilities/slugify'
import { t, type Locale } from '@/i18n'
import { ShikiCode } from './ShikiCode'

const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
  const doc = linkNode.fields.doc
  if (!doc || typeof doc.value !== 'object') return '/'
  const slug = (doc.value as { slug?: string }).slug
  return doc.relationTo === 'posts' ? `/posts/${slug}` : `/${slug}`
}

function headingText(node: any): string {
  return (node?.children ?? []).map((c: any) => (typeof c?.text === 'string' ? c.text : '')).join('')
}

/**
 * Renders the lesson `content` (Lexical) for the courses theme. Overrides the
 * heading converter (anchor ids via the SAME uniqueSlug sequence as
 * extractHeadings, so TOC links resolve) and the code-block converter (Shiki).
 * Built per-render so the dedup `seen` map is fresh each time.
 */
export function CourseLessonProse({ content, locale }: {
  content: DefaultTypedEditorState
  locale: Locale
}) {
  const seen = new Map<string, number>()

  const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    ...LinkJSXConverter({ internalDocToHref }),
    heading: ({ node, nodesToJSX }: any) => {
      const Tag = node.tag as 'h2' | 'h3' | 'h4'
      const children = nodesToJSX({ nodes: node.children })
      if (Tag === 'h2' || Tag === 'h3') {
        const id = uniqueSlug(headingText(node), seen)
        return (
          <Tag id={id} className="ct-anchor">
            {children}
            <a href={`#${id}`} className="ct-anchor__link" aria-hidden="true" tabIndex={-1}>
              #
            </a>
          </Tag>
        )
      }
      return <Tag>{children}</Tag>
    },
    blocks: {
      code: ({ node }: any) => (
        <ShikiCode code={node.fields.code} lang={node.fields.language} locale={locale} />
      ),
      Code: ({ node }: any) => (
        <ShikiCode code={node.fields.code} lang={node.fields.language} locale={locale} />
      ),
    },
  })

  return (
    <div className="course-prose lprose">
      <ConvertRichText data={content} converters={converters} />
    </div>
  )
}
```
> Note `t(locale, 'courses.lesson.onThisPage')` etc. are unused here; the
> import of `t` in this file is only for parity if needed — remove the unused
> `t` import to satisfy lint (`CourseLessonProse` itself needs only `Locale`).
> Keep `import { type Locale } from '@/i18n'`.

- [ ] **Step 4: Build to verify the converters compile**

Run: `pnpm build`
Expected: success. (Smoke of the rendered output happens in Task 9 once it's mounted in the lesson page.)

- [ ] **Step 5: Commit**

```bash
git add src/app/courses-app/_components/CopyButton.tsx src/app/courses-app/_components/ShikiCode.tsx src/app/courses-app/_components/CourseLessonProse.tsx
git commit -m "feat(courses): CourseLessonProse — Shiki code + anchored headings"
```

---

## Task 8: TableOfContents (client scroll-spy)

**Files:**
- Create: `src/app/courses-app/_components/TableOfContents.tsx`

**Interfaces:**
- Consumes: `LessonHeading[]` (Task 2 shape), a `label` string (Task 6 `courses.lesson.onThisPage`).
- Produces: `<TableOfContents headings={…} label={…} />` — sticky right-rail nav; active item tracks scroll via IntersectionObserver; renders nothing when `headings` is empty.

- [ ] **Step 1: Implement**

`src/app/courses-app/_components/TableOfContents.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import type { LessonHeading } from '@/utilities/lessonHeadings'

export function TableOfContents({ headings, label }: {
  headings: LessonHeading[]
  label: string
}) {
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    if (!headings.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id)
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    )
    for (const h of headings) {
      const el = document.getElementById(h.id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [headings])

  if (!headings.length) return null
  return (
    <aside className="lesson-toc" aria-label={label}>
      <div className="lesson-toc__h">{label}</div>
      <nav>
        {headings.map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            className={`lesson-toc__i lvl-${h.level}${active === h.id ? ' active' : ''}`}
          >
            {h.text}
          </a>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Build**

Run: `pnpm build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/app/courses-app/_components/TableOfContents.tsx
git commit -m "feat(courses): sticky scroll-spy TableOfContents"
```

---

## Task 9: LessonView restructure + LessonSidebar + MarkCompleteButton + page wiring

**Files:**
- Create: `src/app/courses-app/_components/LessonSidebar.tsx`, `src/app/courses-app/_components/MarkCompleteButton.tsx`
- Modify: `src/app/courses-app/_components/LessonView.tsx`, `src/app/courses-app/[slug]/learn/[lesson]/page.tsx`

**Interfaces:**
- Consumes: `CourseLessonProse` (7), `TableOfContents` (8), `extractHeadings` (2), `getCompletedLessonIds` (5), `phaseProgress`/`progressFor` (3), i18n (6), `POST /api/courses/progress` (5).
- Produces: a 3-column reading page; the lesson page passes `completedIds` + `headings` into `LessonView`.

- [ ] **Step 1: MarkCompleteButton (client)**

`src/app/courses-app/_components/MarkCompleteButton.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function MarkCompleteButton({ lessonId, initialDone, nextHref, labels }: {
  lessonId: number
  initialDone: boolean
  nextHref: string | null
  labels: { complete: string; completeLast: string; completed: string; undo: string }
}) {
  const [done, setDone] = useState(initialDone)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function post(completed: boolean): Promise<boolean> {
    setBusy(true)
    try {
      const res = await fetch('/api/courses/progress', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lessonId, completed }),
      })
      return res.ok
    } catch {
      return false
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="markdone is-done">
        <span className="markdone__state">✓ {labels.completed}</span>
        <button
          type="button"
          className="markdone__undo"
          disabled={busy}
          onClick={async () => {
            if (await post(false)) setDone(false)
          }}
        >
          {labels.undo}
        </button>
        {nextHref ? (
          <button type="button" className="btn btn--ghost" onClick={() => router.push(nextHref)}>
            →
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="btn btn--primary btn--lg markdone__cta"
      disabled={busy}
      onClick={async () => {
        if (await post(true)) {
          setDone(true)
          if (nextHref) router.push(nextHref)
        }
      }}
    >
      <span className="icon" data-i="check" aria-hidden="true" />
      <span>{nextHref ? labels.complete : labels.completeLast}</span>
    </button>
  )
}
```

- [ ] **Step 2: LessonSidebar (extract from LessonView + add progress)**

`src/app/courses-app/_components/LessonSidebar.tsx`:
```tsx
import Link from 'next/link'
import type { Lesson, Program } from '@/payload-types'
import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'
import { phaseProgress, progressFor } from '@/utilities/courseProgress'

type Phase = NonNullable<Program['phases']>[number]
const pad = (n: number | null | undefined) => String(n ?? 0).padStart(2, '0')

export function LessonSidebar({ slug, program, lesson, sorted, completedIds, locale }: {
  slug: string
  program: Program
  lesson: Lesson
  sorted: Lesson[]
  completedIds: Set<number>
  locale: Locale
}) {
  const phases: Phase[] = program.phases ?? []
  const byPhase = phaseProgress(sorted, completedIds)
  const overall = progressFor(sorted.length, completedIds.size)

  return (
    <aside className="side">
      <details className="navwrap" open>
        <summary>
          <span className="icon" data-i="map" aria-hidden="true" />
          <span>{t(locale, 'courses.lesson.nav')}</span>
          <span className="chev">›</span>
        </summary>
        <div className="side__top">
          <div className="ttl">{program.title}</div>
          <div className="progressbar" aria-label={t(locale, 'courses.progress.label')}>
            <div className="progressbar__track">
              <div className="progressbar__fill" style={{ width: `${overall.pct}%` }} />
            </div>
            <span className="progressbar__txt">
              {overall.done}/{overall.total} {t(locale, 'courses.progress.unit')}
            </span>
          </div>
        </div>
        <nav className="navlist" aria-label={t(locale, 'courses.lesson.navStages')}>
          {phases.map((p) => {
            const rows = sorted.filter((l) => l.phaseId === p.letter)
            const pp = byPhase.get(p.letter ?? '') ?? { done: 0, total: rows.length }
            return (
              <div className="navphase" key={p.letter}>
                <div className="navphase__h">
                  <span className="lp">{p.letter}</span>
                  <span className="nm">{p.name}</span>
                  <span className="ct">{pp.done}/{pp.total}</span>
                </div>
                {rows.map((l) => {
                  const current = l.id === lesson.id
                  const isDone = completedIds.has(l.id)
                  return (
                    <Link
                      key={l.id}
                      className={`navitem${l.hardGate ? ' gate' : ''}${isDone ? ' done' : ''}`}
                      href={getLocalizedPath(`/${slug}/learn/${l.slug}`, locale)}
                      aria-current={current ? 'true' : undefined}
                    >
                      <span className="st">
                        {isDone ? (
                          <span className="icon" data-i="check" aria-hidden="true" />
                        ) : l.hardGate ? (
                          <span className="icon" data-i="lock" aria-hidden="true" />
                        ) : null}
                      </span>
                      <span className="lbl">{l.title}</span>
                      <span className="nr">{pad(l.nr)}</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>
      </details>
    </aside>
  )
}
```

- [ ] **Step 3: Restructure LessonView**

Rewrite `src/app/courses-app/_components/LessonView.tsx` to: accept `completedIds` + `headings`; use `LessonSidebar`; render the prose body (`CourseLessonProse`) as the centerpiece; show the video ONLY when `youtubeEmbedUrl` is set (remove the `.ph-video` placeholder branch); add a meta row with reading time; mount `MarkCompleteButton`; mount `TableOfContents` in a right rail. Keep `why` (lead) before the body, and `what`/`dod`/skills/deps/pager. Full file:
```tsx
import Link from 'next/link'
import { Fragment } from 'react'
import type { Lesson, Program } from '@/payload-types'
import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'
import type { LessonHeading } from '@/utilities/lessonHeadings'
import { LessonSidebar } from './LessonSidebar'
import { CourseLessonProse } from './CourseLessonProse'
import { TableOfContents } from './TableOfContents'
import { MarkCompleteButton } from './MarkCompleteButton'

type Phase = NonNullable<Program['phases']>[number]
const pad = (n: number | null | undefined) => String(n ?? 0).padStart(2, '0')

function toParagraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
}
function Paragraphs({ text, lead }: { text: string; lead?: boolean }) {
  return (
    <>
      {toParagraphs(text).map((para, i) => (
        <p key={i} className={lead && i === 0 ? 'lead' : undefined}>
          {para.split('\n').map((line, j, arr) => (
            <Fragment key={j}>
              {line}
              {j < arr.length - 1 ? <br /> : null}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  )
}

export function LessonView({ slug, program, lesson, allLessons, completedIds, headings, locale }: {
  slug: string
  program: Program
  lesson: Lesson
  allLessons: Lesson[]
  completedIds: Set<number>
  headings: LessonHeading[]
  locale: Locale
}) {
  const phases: Phase[] = program.phases ?? []
  const sorted = [...allLessons].sort((a, b) => (a.nr ?? 0) - (b.nr ?? 0))
  const idx = sorted.findIndex((l) => l.id === lesson.id)
  const prev = idx > 0 ? sorted[idx - 1] : null
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null
  const phase = phases.find((p) => p.letter === lesson.phaseId) ?? null
  const deps = (lesson.dependencies ?? []).filter(
    (d): d is Lesson => typeof d === 'object' && d !== null,
  )
  const skills = (lesson.skills ?? []).map((s) => s.skill).filter(Boolean)
  const nextHref = next ? getLocalizedPath(`/${slug}/learn/${next.slug}`, locale) : null

  const timeMin = lesson.estTimeMin?.min ?? 0
  const timeMax = lesson.estTimeMin?.max ?? 0
  const timeLabel =
    timeMax > 0 ? `${timeMin && timeMin !== timeMax ? `${timeMin}–` : '~'}${timeMax} ${t(locale, 'courses.lesson.readMin')}` : null

  return (
    <div className="lesson">
      <LessonSidebar
        slug={slug}
        program={program}
        lesson={lesson}
        sorted={sorted}
        completedIds={completedIds}
        locale={locale}
      />

      <main className="lmain" id="lmain">
        <div className="crumb">
          <Link href={getLocalizedPath(`/${slug}`, locale)}>{t(locale, 'courses.lesson.syllabus')}</Link>
          {phase ? (
            <>
              <span className="sep">/</span>
              <span>{t(locale, 'courses.lesson.phase')} {phase.letter} · {phase.name}</span>
            </>
          ) : null}
          <span className="sep">/</span>
          <span>{t(locale, 'courses.lesson.stage')} {pad(lesson.nr)} / {pad(sorted.length)}</span>
        </div>

        <header className="lhead">
          <h1>{lesson.title}</h1>
          <div className="lhead__meta">
            {timeLabel ? <span className="lmeta">{timeLabel}</span> : null}
            <div className="badges">
              {lesson.hardGate ? <span className="badge gate">{t(locale, 'courses.badge.gate')}</span> : null}
              {lesson.hybrid ? <span className="badge hybrid">{t(locale, 'courses.badge.hybrid')}</span> : null}
              {lesson.kind === 'decision' ? <span className="badge decision">{t(locale, 'courses.badge.decision')}</span> : null}
            </div>
          </div>
        </header>

        {lesson.why ? (
          <section className="lsec lintro">
            <Paragraphs text={lesson.why} lead />
          </section>
        ) : null}

        {lesson.youtubeEmbedUrl ? (
          <div className="lvideo">
            <div className="lvideo__frame">
              <iframe
                src={lesson.youtubeEmbedUrl}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : null}

        {lesson.content ? (
          <CourseLessonProse content={lesson.content as DefaultTypedEditorState} locale={locale} />
        ) : null}

        {lesson.what ? (
          <section className="lsec">
            <div className="lbl">{t(locale, 'courses.lesson.what')}</div>
            <Paragraphs text={lesson.what} />
          </section>
        ) : null}

        {lesson.dod ? (
          <section className="lsec">
            <div className="lbl">{t(locale, 'courses.lesson.dod')}</div>
            <div className="dod">
              <span className="icon" data-i="check" aria-hidden="true" />
              <div className="dod__body"><Paragraphs text={lesson.dod} /></div>
            </div>
          </section>
        ) : null}

        {skills.length ? (
          <section className="lsec">
            <div className="lbl">{t(locale, 'courses.lesson.skills')}</div>
            <div className="chips">
              {skills.map((s, i) => <span className="chip" key={i}>{s}</span>)}
            </div>
          </section>
        ) : null}

        {deps.length ? (
          <section className="lsec">
            <div className="lbl">{t(locale, 'courses.lesson.deps')}</div>
            <div className="deplist">
              {deps.map((d) => (
                <Link className="deprow" href={getLocalizedPath(`/${slug}/learn/${d.slug}`, locale)} key={d.id}>
                  <span className="dn">{pad(d.nr)}</span>
                  <span className="dnm">{d.title}</span>
                  <span className="go"><span className="icon" data-i="arrow" aria-hidden="true" /></span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className="lsec markdone-wrap">
          <MarkCompleteButton
            lessonId={lesson.id}
            initialDone={completedIds.has(lesson.id)}
            nextHref={nextHref}
            labels={{
              complete: t(locale, 'courses.lesson.markComplete'),
              completeLast: t(locale, 'courses.lesson.markCompleteLast'),
              completed: t(locale, 'courses.lesson.completed'),
              undo: t(locale, 'courses.lesson.undo'),
            }}
          />
        </div>

        <nav className="pager" aria-label={t(locale, 'courses.lesson.pagerLabel')}>
          {prev ? (
            <Link className="pg" href={getLocalizedPath(`/${slug}/learn/${prev.slug}`, locale)}>
              <span className="k"><span className="icon" data-i="back" aria-hidden="true" />{t(locale, 'courses.lesson.prev')}</span>
              <span className="v">{pad(prev.nr)} · {prev.title}</span>
            </Link>
          ) : (
            <div className="pg disabled"><span className="k">{t(locale, 'courses.lesson.start')}</span><span className="v">—</span></div>
          )}
          {next ? (
            <Link className="pg next" href={getLocalizedPath(`/${slug}/learn/${next.slug}`, locale)}>
              <span className="k">{t(locale, 'courses.lesson.next')}<span className="icon" data-i="arrow" aria-hidden="true" /></span>
              <span className="v">{pad(next.nr)} · {next.title}</span>
            </Link>
          ) : (
            <div className="pg next disabled"><span className="k">{t(locale, 'courses.lesson.end')}</span><span className="v">—</span></div>
          )}
        </nav>
      </main>

      <TableOfContents headings={headings} label={t(locale, 'courses.lesson.onThisPage')} />
    </div>
  )
}
```

- [ ] **Step 4: Wire the lesson page (fetch progress + headings)**

In `src/app/courses-app/[slug]/learn/[lesson]/page.tsx`, after `allLessons` is built and before the return, add the imports at top:
```ts
import { getCompletedLessonIds } from '@/utilities/courseProgress'
import { extractHeadings } from '@/utilities/lessonHeadings'
```
Then compute and pass new props:
```ts
  const completedIds = await getCompletedLessonIds(payload, user.id, program.id)
  const headings = extractHeadings((lesson as Lesson).content)

  return (
    <LessonView
      slug={slug}
      program={program as Program}
      lesson={lesson as Lesson}
      allLessons={allLessons}
      completedIds={completedIds}
      headings={headings}
      locale={locale}
    />
  )
```

- [ ] **Step 5: Build**

Run: `pnpm build`
Expected: success.

- [ ] **Step 6: Smoke (status codes + authed reading view)**

```bash
# Unauthenticated lesson URL must redirect to login (middleware host-rewrite).
curl -s -o /dev/null -w "lesson_noauth=%{http_code}\n" \
  -H "Host: courses.devince.dev" "http://localhost:3010/<courseSlug>/learn/<lessonSlug>"
```
Expected: `307` (redirect to `/login`). Then **manually in a browser**, signed in as the dev admin (admin bypasses the enrolment gate): open a lesson that has `content` → confirm the prose renders with highlighted code + anchored headings, the right-rail TOC tracks scroll, the sidebar shows checkmarks, and clicking "Ukończ i dalej →" marks complete and advances (a `lesson-progress` row is created; the sidebar check appears).

- [ ] **Step 7: Commit**

```bash
git add src/app/courses-app/_components/LessonSidebar.tsx src/app/courses-app/_components/MarkCompleteButton.tsx src/app/courses-app/_components/LessonView.tsx "src/app/courses-app/[slug]/learn/[lesson]/page.tsx"
git commit -m "feat(courses): prose-first lesson page — sidebar progress, TOC, mark-complete"
```

---

## Task 10: Syllabus polish (time, total scope, resume, progress)

**Files:**
- Modify: `src/app/courses-app/_components/Curriculum.tsx`, `src/app/courses-app/_components/SyllabusHero.tsx`, `src/app/courses-app/account/page.tsx`, `src/app/courses-app/[slug]/page.tsx`

**Interfaces:**
- Consumes: `isEnrolled`/`getCompletedLessonIds`/`phaseProgress`/`progressFor`/`firstIncompleteLesson` (3, 5), `courseMeta` (existing), i18n (6).
- Produces: enrolled viewers see per-phase progress + a resume CTA deep-linked to the first incomplete lesson; everyone sees per-lesson time + a total-scope line.

- [ ] **Step 1: Curriculum — per-lesson time + total scope + optional per-phase progress**

In `src/app/courses-app/_components/Curriculum.tsx`, extend the props and render. Change the signature to add optional progress, add a time helper, and render time per row + a total in the header:
```tsx
import { progressFor } from '@/utilities/courseProgress'

// ...add to the props type:
//   byPhase?: Map<string, { done: number; total: number }>
//   totalTimeMax?: number

const lessonTime = (l: Lesson, unit: string) =>
  l.estTimeMin?.max ? `~${l.estTimeMin.max} ${unit}` : null
```
In the header `<h2 className="section-title">` line, append a total-time span when `totalTimeMax`:
```tsx
        <h2 className="section-title">
          {phases.length} {t(locale, 'courses.syllabus.metaPhases')} · {lessons.length}{' '}
          {t(locale, 'courses.syllabus.metaStages')}
          {totalTimeMax ? <> · ~{Math.round(totalTimeMax / 60)} {t(locale, 'courses.syllabus.totalTimeUnit')}</> : null}
        </h2>
```
In each `phase-block__head`, when `byPhase` is provided, show a small progress chip after `.pc`:
```tsx
                {byPhase ? (() => {
                  const pp = byPhase.get(phase.letter ?? '') ?? { done: 0, total: rows.length }
                  const pr = progressFor(pp.total, pp.done)
                  return (
                    <div className="pc-progress">
                      <div className="progressbar__track"><div className="progressbar__fill" style={{ width: `${pr.pct}%` }} /></div>
                      <span>{pr.done}/{pr.total}</span>
                    </div>
                  )
                })() : null}
```
In each `.srow`, add a time element after `srow__badges`:
```tsx
                    {lessonTime(lesson, t(locale, 'courses.lesson.readMin')) ? (
                      <span className="srow__time">{lessonTime(lesson, t(locale, 'courses.lesson.readMin'))}</span>
                    ) : null}
```

- [ ] **Step 2: SyllabusHero — resume CTA**

In `src/app/courses-app/_components/SyllabusHero.tsx`, add an optional `resumeSlug?: string | null` and `allDone?: boolean` to the props. In the enrolled branch (the final `else` that renders the `Link` with `startHref`), prefer the resume target + label:
```tsx
          const resumeHref = getLocalizedPath(
            resumeSlug ? `/${program.slug}/learn/${resumeSlug}` : startHref.replace(getLocalizedPath('', locale), '') || startHref,
            locale,
          )
```
Simpler — replace the enrolled `Link`'s href/label:
```tsx
              ) : (
                <Link
                  className="btn btn--primary btn--lg"
                  href={
                    enrolled && resumeSlug
                      ? getLocalizedPath(`/${program.slug}/learn/${resumeSlug}`, locale)
                      : startHref
                  }
                >
                  <span className="icon" data-i="play" aria-hidden="true" />
                  <span>
                    {enrolled
                      ? allDone
                        ? t(locale, 'courses.syllabus.allDone')
                        : t(locale, 'courses.syllabus.resume')
                      : program.ctaLabel || t(locale, 'courses.syllabus.cta')}
                  </span>
                </Link>
              )}
```

- [ ] **Step 3: Wire the syllabus page**

In `src/app/courses-app/[slug]/page.tsx`, after `enrolled` is computed, fetch progress only for enrolled viewers and pass new props:
```ts
import { getCompletedLessonIds, phaseProgress, firstIncompleteLesson } from '@/utilities/courseProgress'

// ...after `enrolled`:
  let byPhase: Map<string, { done: number; total: number }> | undefined
  let resumeSlug: string | null = firstLessonSlug
  let allDone = false
  if (enrolled && user) {
    const completed = await getCompletedLessonIds(payload, user.id, program.id)
    byPhase = phaseProgress(lessons, completed)
    const fi = firstIncompleteLesson(lessons, completed)
    resumeSlug = fi?.slug ?? null
    allDone = lessons.length > 0 && !fi
  }
```
Pass to the components:
```tsx
      <SyllabusHero … resumeSlug={resumeSlug} allDone={allDone} />
      …
      <Curriculum slug={program.slug} phases={phases} lessons={lessons} locale={locale}
        byPhase={byPhase} totalTimeMax={meta.timeMax} />
```
(`SyllabusHero` keeps its existing props; add `resumeSlug`/`allDone`. `Curriculum` adds `byPhase`/`totalTimeMax`.)

- [ ] **Step 4: Account page — per-course progress bar + resume**

In `src/app/courses-app/account/page.tsx`, after loading `programs`, compute per-program progress and render a bar + a resume link. Add imports:
```ts
import { getCompletedLessonIds, progressFor, firstIncompleteLesson } from '@/utilities/courseProgress'
import type { Lesson } from '@/payload-types'
```
After `programs` is built, build a progress map (one lessons query per course — fine for a handful of purchases):
```ts
  const progressByProgram = new Map<number, { pct: number; done: number; total: number; resumeSlug: string | null }>()
  for (const p of programs as any[]) {
    const lessonsRes = await payload.find({
      collection: 'lessons',
      where: { program: { equals: p.id } },
      sort: 'nr',
      limit: 1000,
      overrideAccess: true,
      depth: 0,
      locale,
    })
    const ls = lessonsRes.docs as Lesson[]
    const completed = await getCompletedLessonIds(payload, user.id, p.id)
    const pr = progressFor(ls.length, completed.size)
    const fi = firstIncompleteLesson(ls, completed)
    progressByProgram.set(p.id, { ...pr, resumeSlug: fi?.slug ?? ls[0]?.slug ?? null })
  }
```
Inside each course card, before the CTA, render the bar + change the CTA to resume:
```tsx
              {(() => {
                const pr = progressByProgram.get(p.id)
                if (!pr) return null
                return (
                  <div className="progressbar auth-progress" aria-label={t(locale, 'courses.progress.label')}>
                    <div className="progressbar__track"><div className="progressbar__fill" style={{ width: `${pr.pct}%` }} /></div>
                    <span className="progressbar__txt">{pr.done}/{pr.total} {t(locale, 'courses.progress.unit')}</span>
                  </div>
                )
              })()}
```
Leave the existing `Link` to the syllabus as is (the syllabus hero now carries the resume CTA), OR point the card's CTA label to resume — keep linking to `/${slug}` for simplicity (the hero handles resume). Minimal change: just add the progress bar.

- [ ] **Step 5: Build**

Run: `pnpm build`
Expected: success.

- [ ] **Step 6: Smoke**

```bash
curl -s -o /dev/null -w "syllabus=%{http_code}\n" -H "Host: courses.devince.dev" "http://localhost:3010/<courseSlug>"
```
Expected: `200`, and the curriculum shows per-lesson `~N min` + the total `~Hh` in the header. Signed in as an enrolled/admin user, the hero CTA reads "Wróć do nauki" and deep-links to the first incomplete lesson; `/account` shows a progress bar per course.

- [ ] **Step 7: Commit**

```bash
git add src/app/courses-app/_components/Curriculum.tsx src/app/courses-app/_components/SyllabusHero.tsx src/app/courses-app/account/page.tsx "src/app/courses-app/[slug]/page.tsx"
git commit -m "feat(courses): syllabus polish — time, total scope, per-phase progress, resume"
```

---

## Task 11: CSS + fonts (reading surface, prose, Shiki, TOC, progress)

**Files:**
- Modify: `src/app/courses-app/layout.tsx` (next/font), `src/app/courses-app/course-theme.css`

**Interfaces:**
- Consumes: the class names introduced in Tasks 7–10 (`.course-prose`/`.lprose`, `.lc*`, `.lesson-toc*`, `.progressbar*`, `.navitem.done`, `.ct-anchor*`, `.srow__time`, `.lhead__meta`, `.lmeta`, `.markdone*`, `.lintro`).
- Produces: the 3-column lesson grid, calm dark reading surface, premium code blocks, sticky TOC, progress visuals, self-hosted fonts.

- [ ] **Step 1: Wire fonts in the courses layout**

In `src/app/courses-app/layout.tsx`, add at the top:
```ts
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-ui', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })
```
Apply the variables on `<html>`:
```tsx
    <html lang={locale} className={`dark ${inter.variable} ${mono.variable}`} suppressHydrationWarning>
```
(The CSS already reads `--font-ui` / `--font-mono`; next/font now provides them. Keep the existing system-stack fallback values in `course-theme.css` so a font failure degrades gracefully.)

- [ ] **Step 2: Add the pro-UX CSS**

Append a new section to `src/app/courses-app/course-theme.css`:
```css
/* ============================================================
   PRO UX — lesson reading (3-col), prose, code, TOC, progress
   ============================================================ */

/* 3-column lesson grid: nav | prose | TOC. Falls back to the existing
   2-col (.side + .lmain) when TOC is absent/empty. */
.lesson {
  grid-template-columns: var(--side-w, 260px) minmax(0, 1fr) var(--toc-w, 220px);
}
@media (max-width: 1100px) {
  .lesson { grid-template-columns: var(--side-w, 260px) minmax(0, 1fr); }
  .lesson-toc { display: none; }
}
@media (max-width: 900px) {
  .lesson { grid-template-columns: 1fr; }
}

/* Calm reading surface: solid-ish dark, high contrast, NO blur behind text. */
.lmain { backdrop-filter: none; }
.course-prose,
.lprose {
  max-width: 68ch;
  font-family: var(--font-ui, system-ui, sans-serif);
  font-size: 17px;
  line-height: 1.7;
  color: var(--text);
}
.lprose > * + * { margin-top: 1.1em; }
.lprose h2, .lprose h3 { line-height: 1.25; scroll-margin-top: calc(var(--nav-h, 64px) + 16px); }
.lprose h2 { font-size: 1.5em; margin-top: 2em; }
.lprose h3 { font-size: 1.22em; margin-top: 1.6em; }
.lprose a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
.lprose ul, .lprose ol { padding-left: 1.4em; }
.lprose li + li { margin-top: 0.4em; }
.lprose blockquote {
  border-left: 3px solid var(--accent);
  padding-left: 1em; color: var(--muted, #aab);
}

/* Hover-revealed heading anchors */
.ct-anchor { position: relative; }
.ct-anchor__link {
  margin-left: 0.4em; opacity: 0; text-decoration: none; color: var(--accent);
  transition: opacity 0.15s;
}
.ct-anchor:hover .ct-anchor__link { opacity: 0.6; }

/* Shiki code block: title bar + copy + the highlighted body */
.lc { margin: 1.4em 0; border-radius: 12px; overflow: hidden; border: 1px solid var(--surface-2, rgba(255,255,255,0.08)); }
.lc__bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.5em 0.85em; font-family: var(--font-mono, monospace); font-size: 12px;
  color: var(--muted, #9aa); background: rgba(0,0,0,0.35);
  border-bottom: 1px solid var(--surface-2, rgba(255,255,255,0.08));
}
.lc__copy {
  font: inherit; cursor: pointer; border: 1px solid var(--surface-2, rgba(255,255,255,0.12));
  background: transparent; color: var(--muted, #9aa); border-radius: 6px; padding: 2px 8px;
}
.lc__copy:hover { color: var(--text); border-color: var(--accent); }
.lc__body pre.shiki { margin: 0; padding: 1em 1.1em; overflow-x: auto; font-family: var(--font-mono, monospace); font-size: 14px; line-height: 1.6; }
/* Shiki transformer line states */
.lc__body .line.highlighted { background: rgba(229,181,92,0.12); display: inline-block; width: 100%; }
.lc__body .line.diff.add { background: rgba(16,185,129,0.14); }
.lc__body .line.diff.remove { background: rgba(239,68,68,0.14); opacity: 0.8; }
.lc__body.has-focused .line:not(.focused) { opacity: 0.4; filter: blur(0.4px); }

/* Sticky in-lesson TOC */
.lesson-toc { position: sticky; top: calc(var(--nav-h, 64px) + 16px); align-self: start; max-height: 80vh; overflow-y: auto; font-size: 13px; }
.lesson-toc__h { text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; color: var(--muted, #9aa); margin-bottom: 0.6em; }
.lesson-toc__i { display: block; padding: 4px 0 4px 10px; color: var(--muted, #9aa); border-left: 2px solid transparent; text-decoration: none; }
.lesson-toc__i.lvl-3 { padding-left: 22px; }
.lesson-toc__i:hover { color: var(--text); }
.lesson-toc__i.active { color: var(--accent); border-left-color: var(--accent); }

/* Progress bar (sidebar + syllabus + account) */
.progressbar { display: flex; align-items: center; gap: 8px; }
.progressbar__track { flex: 1; height: 6px; border-radius: 99px; background: var(--surface-2, rgba(255,255,255,0.1)); overflow: hidden; }
.progressbar__fill { height: 100%; background: var(--accent); border-radius: 99px; transition: width 0.3s; }
.progressbar__txt { font-size: 12px; color: var(--muted, #9aa); white-space: nowrap; }
.side__top .progressbar { margin-top: 8px; }
.pc-progress { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--muted, #9aa); min-width: 80px; }
.pc-progress .progressbar__track { width: 50px; flex: none; }
.auth-progress { margin: 10px 0; }

/* Completed lesson in the sidebar nav */
.navitem.done .lbl { color: var(--muted, #9aa); }
.navitem.done .st .icon { color: var(--done, #10B981); }

/* Lesson header meta + intro lead */
.lhead__meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
.lmeta { font-size: 13px; color: var(--muted, #9aa); }
.lintro .lead { font-size: 1.1em; color: var(--text); }
.srow__time { font-size: 12px; color: var(--muted, #9aa); }

/* Mark-complete control */
.markdone-wrap { margin-top: 2em; }
.markdone { display: flex; align-items: center; gap: 12px; }
.markdone__state { color: var(--done, #10B981); font-weight: 600; }
.markdone__undo { background: none; border: none; color: var(--muted, #9aa); cursor: pointer; text-decoration: underline; font: inherit; }
```
(If any referenced CSS var — `--side-w`, `--toc-w`, `--nav-h`, `--muted`, `--surface-2`, `--done` — is not already defined in `course-theme.css`, the fallbacks in the rules above apply; confirm the existing `:root`/`.light` token names during this task and align the var names rather than duplicating tokens.)

- [ ] **Step 3: Build + full smoke**

Run: `pnpm build`
Expected: success. Then load a lesson (signed in) and the syllabus in the browser:
- 3 columns on wide screens; TOC hidden < 1100px; single column < 900px.
- Prose is ≤ ~68ch, comfortable line-height, headings have hover `#`.
- Code blocks: title bar + working copy button + highlighted lines.
- Sidebar/syllabus/account progress bars render; completed lessons show a green check.

- [ ] **Step 4: Commit**

```bash
git add src/app/courses-app/layout.tsx src/app/courses-app/course-theme.css
git commit -m "style(courses): reading surface, prose measure, Shiki, TOC, progress, fonts"
```

---

## Task 12: Full verification + PR

**Files:** none (verification + PR).

- [ ] **Step 1: Run the full integration suite**

Run: `pnpm test:int`
Expected: all green (new util tests + the i18n parity test + existing suite).

- [ ] **Step 2: Production build**

Run: `pnpm build`
Expected: success, no type errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: clean (fix any unused-import/any warnings introduced — e.g. drop the unused `t` import noted in Task 7).

- [ ] **Step 4: Final smoke pass**

With the dev server running, confirm: syllabus `200`, lesson unauth `307`, `/api/courses/progress` unauth `401` / bad body `400`; signed-in admin lesson renders prose + TOC + Shiki + mark-complete + sidebar checks; syllabus resume CTA + progress; account progress bars.

- [ ] **Step 5: Push the branch + open the PR**

```bash
git push -u origin feat/courses-pro-ux
gh pr create --title "feat(courses): Pro UX — lesson reading, progress, syllabus polish" --body "<runbook below>"
```
PR body MUST include a **deploy runbook**: (1) merge → deploy; (2) **run the `lesson_progress` migration on prod** (the only schema change) via the prod migrate step (mirroring the existing courses runbook), confirm the `lesson_progress` table + unique index exist; (3) reconcile/redeploy the app; (4) no env changes required (Shiki + fonts are build-time only). Note that content writes are unaffected and `force-dynamic` pages reflect immediately. **Do not deploy — the owner runs it.**

---

## Self-Review

**Spec coverage:**
- A. Lesson reading: prose render (T7, T9), 3-col layout + reading surface (T11), Shiki (T1, T7, T11), anchored headings (T2, T7), sticky TOC (T8, T9, T11), kill placeholder (T9). ✓
- B. Progress: collection + migration (T4), route (T5), mark-complete (T9), sidebar checks + bars (T9, T11), resume (T10). ✓
- C. Syllabus polish: time + total scope + per-phase + resume + account (T10). ✓
- Typography/fonts (T11), i18n parity (T6), security (route enrolment gate T5, own-or-admin read T4), testing (TDD T1–T3, T6; build/smoke T5, T7–T12; migrate-smoke T4). ✓

**Placeholder scan:** No TBD/“handle edge cases”. Concrete theme chosen (`github-dark`). The one acknowledged recon point — exact existing CSS var names in `course-theme.css` — is handled by fallbacks + an explicit “align the var names” instruction in T11, not a placeholder. The route’s 200/403 paths are intentionally UI-smoked (no route harness in this repo) — stated, not hidden.

**Type consistency:** `isEnrolled(user, programId)`, `getCompletedLessonIds(payload, userId, programId)→Set<number>`, `extractHeadings→LessonHeading[]`, `uniqueSlug(text, seen)`, `progressFor(total, done)`, `phaseProgress→Map<string,{done,total}>`, `firstIncompleteLesson(sorted, completed)→T|null` are used identically across T7–T11. `LessonView` prop additions (`completedIds: Set<number>`, `headings: LessonHeading[]`) match the page wiring in T9. `MarkCompleteButton` labels object matches T9 usage.
