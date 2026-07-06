# Public auto-changelog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline) or subagent-driven-development. Steps use `- [ ]`.

**Goal:** Platform-wide public `/changelog` on apps+courses, auto-published from a Coolify deploy webhook: PRs since last entry → Claude → short PL/EN notes → `changelog` Payload global.

**Architecture:** Mirrors the existing `Roadmap` global pattern (global config + external REST API + view + migration). A secret-gated endpoint pulls PRs from the GitHub compare API (the container has no `.git`), a pure filter drops non-user-facing PRs, Claude (`claude-opus-4-8`) summarizes the rest into ≤5 tagged bilingual notes, and the orchestrator writes one `changelog` entry (idempotent on the stored HEAD sha).

**Tech Stack:** Next.js 15 + Payload CMS 3 (Postgres, migrations only `push:false`), `@anthropic-ai/sdk` (NEW), TypeScript, Vitest (`pnpm test:int`).

## Global Constraints

- Schema ONLY via migrations (`push:false`); after model change: `pnpm generate:types` + `pnpm payload migrate:create <name>`; commit `.ts` + `.json` snapshot. Dev DB `localhost:5436`.
- Respond/commit in repo conventions; branch `feat/public-changelog` (already created, spec committed).
- Secrets (`GITHUB_TOKEN`, `ANTHROPIC_API_KEY`, `CHANGELOG_WEBHOOK_SECRET`, `EXTERNAL_API_TOKEN`) from env — never echo.
- Model: `claude-opus-4-8` via `@anthropic-ai/sdk`, structured outputs (`messages.parse` + `zodOutputFormat`), handle `stop_reason === 'refusal'`.
- Repo: `bartek-filipiuk/devince-dev`. Tags enum: `apps | courses | platform | security`.
- Kill dev server by port (`fuser -k 3010/tcp`), never broad pkill.

---

### Task 1: `changelog` Payload global + dependency + types + migration

**Files:**
- Add dep: `@anthropic-ai/sdk` (package.json)
- Create: `src/Changelog/config.ts`
- Modify: `src/payload.config.ts` (import + `globals` array)
- Migration: `src/migrations/<ts>_changelog_global.ts` + `.json`

**Produces:** Payload global slug `'changelog'` with `entries[]` (each: `notes[]{ text(localized), tag }`, `date`, `toSha`, `prRefs[]{number}`). Generated type `Changelog` in `src/payload-types.ts`.

- [ ] `pnpm add @anthropic-ai/sdk`
- [ ] Create `src/Changelog/config.ts`:

```ts
import type { GlobalConfig } from 'payload'

export const Changelog: GlobalConfig = {
  slug: 'changelog',
  access: { read: () => true },
  admin: { group: 'Content' },
  fields: [
    {
      name: 'entries',
      type: 'array',
      labels: { singular: 'Changelog entry', plural: 'Changelog entries' },
      admin: { initCollapsed: true },
      fields: [
        { name: 'date', type: 'date', required: true },
        {
          name: 'notes',
          type: 'array',
          required: true,
          minRows: 1,
          fields: [
            { name: 'text', type: 'textarea', required: true, localized: true },
            {
              name: 'tag',
              type: 'select',
              required: true,
              defaultValue: 'platform',
              options: [
                { label: 'Apps', value: 'apps' },
                { label: 'Courses', value: 'courses' },
                { label: 'Platform', value: 'platform' },
                { label: 'Security', value: 'security' },
              ],
            },
          ],
        },
        { name: 'toSha', type: 'text', admin: { readOnly: true, description: 'HEAD sha covered by this entry (idempotency).' } },
        { name: 'prRefs', type: 'array', admin: { readOnly: true }, fields: [{ name: 'number', type: 'number' }] },
      ],
    },
  ],
}
```

- [ ] Register in `src/payload.config.ts`: add `import { Changelog } from './Changelog/config'` near the `Roadmap` import; add `Changelog` to the `globals: [Header, Footer, SiteSettings, Roadmap]` array → `[..., Roadmap, Changelog]`.
- [ ] `pnpm generate:types` → verify `Changelog` type appears in `src/payload-types.ts`.
- [ ] Ensure dev DB up: `docker compose up -d`. Create migration: `pnpm payload migrate:create changelog_global`. Inspect the generated `.ts` — a brand-new global table is additive (CREATE TABLE), no NOT-NULL-on-existing-rows hazard. Run `pnpm payload migrate`.
- [ ] Commit: `feat(changelog): add changelog Payload global + migration`

---

### Task 2: i18n keys + parity test

**Files:**
- Modify: `src/i18n/translations.ts` (pl + en blocks)
- Test: `src/i18n/translations.test.ts` (parity already enforced; add explicit key presence)

**Produces:** `TranslationKey`s `changelog.meta|title|lead|empty`, `changelog.tag.{apps,courses,platform,security}`, `apps.nav.changelog`, `courses.nav.changelog`.

- [ ] Add to `pl` block (next to roadmap keys): 
  `'changelog.meta':'Changelog'`, `'changelog.title':'Co nowego'`, `'changelog.lead':'Najnowsze zmiany na platformie.'`, `'changelog.empty':'Wkrótce pojawią się tu zmiany.'`, `'changelog.tag.apps':'Apps'`, `'changelog.tag.courses':'Kursy'`, `'changelog.tag.platform':'Platforma'`, `'changelog.tag.security':'Bezpieczeństwo'`, `'apps.nav.changelog':'Co nowego'`, `'courses.nav.changelog':'Co nowego'`.
- [ ] Add to `en` block: `'changelog.meta':'Changelog'`, `'changelog.title':"What's new"`, `'changelog.lead':'The latest changes on the platform.'`, `'changelog.empty':'Changes will appear here soon.'`, `'changelog.tag.apps':'Apps'`, `'changelog.tag.courses':'Courses'`, `'changelog.tag.platform':'Platform'`, `'changelog.tag.security':'Security'`, `'apps.nav.changelog':"What's new"`, `'courses.nav.changelog':"What's new"`.
- [ ] Add a test asserting `t('pl','changelog.title')` and `t('en','changelog.tag.security')` resolve (and existing pl/en parity test passes).
- [ ] Run `pnpm vitest run src/i18n/translations.test.ts` → PASS.
- [ ] Commit: `feat(changelog): i18n keys (PL/EN)`

---

### Task 3: `selectChangelogPRs` (pure filter)

**Files:** Create `src/utilities/changelogSelect.ts`, Test `src/utilities/changelogSelect.test.ts`

**Produces:** `type PR = { number:number; title:string; body:string; labels:string[] }`; `selectChangelogPRs(prs: PR[]): (PR & { isSecurity: boolean })[]`.

- [ ] Write failing test: chore/docs/ci/test/build/style/refactor prefixes dropped; `[skip-changelog]` in title or body dropped; `feat`/`fix`/`perf` kept; `security:`-prefixed or `security`-labeled kept with `isSecurity:true`.
- [ ] Run `pnpm vitest run src/utilities/changelogSelect.test.ts` → FAIL.
- [ ] Implement: regex `^(chore|ci|build|test|docs|style|refactor)(\(.+\))?[:!]` on title → drop; `/\[skip-changelog\]/i` in `title+body` → drop; `isSecurity = /^security|^fix\(sec/i.test(title) || labels.includes('security')`.
- [ ] Run test → PASS. Commit: `feat(changelog): selectChangelogPRs filter`

---

### Task 4: `parseCompare` (pure GitHub parse)

**Files:** Create `src/utilities/githubCompare.ts`, Test `src/utilities/githubCompare.test.ts`

**Produces:** `type CompareResult = { headSha:string; commits:{ sha:string; message:string }[] }`; `parseCompare(json:unknown): CompareResult`.

- [ ] Write failing test on a mocked GitHub compare JSON (`{ commits:[{sha,commit:{message}}] }` + we derive head from last commit sha) → expect `headSha` = last commit sha, commits mapped.
- [ ] Run → FAIL.
- [ ] Implement defensive parse (guard arrays/strings); `headSha` = last commit's sha (the compare `...main` head); each commit → `{ sha, message: commit.commit.message }`.
- [ ] Run → PASS. Commit: `feat(changelog): parseCompare`

---

### Task 5: `summarizeChangelog` (Claude)

**Files:** Create `src/utilities/changelogSummarize.ts`, Test `src/utilities/changelogSummarize.test.ts`

**Consumes:** `selectChangelogPRs` output. **Produces:** `type Note = { tag:'apps'|'courses'|'platform'|'security'; pl:string; en:string }`; `summarizeChangelog(prs, deps?): Promise<Note[]>` where `deps.client` is injectable for tests; on Claude failure/refusal → `fallbackNotes(prs)` (title-derived).

- [ ] Write failing tests: (a) injected fake client returning valid parsed notes → returned as-is; (b) injected client that throws → `fallbackNotes` used (one note per PR, tag heuristic, security PRs → generic text); (c) client returns `stop_reason:'refusal'` → fallback.
- [ ] Run → FAIL.
- [ ] Implement: build prompt from PRs (title+body, mark security), call `client.messages.parse({ model:'claude-opus-4-8', max_tokens:4096, output_config:{ format: zodOutputFormat(NotesSchema) }, messages:[{role:'user',content:prompt}] })`; validate `parsed_output`; on any throw / null / refusal → `fallbackNotes`. `NotesSchema = z.object({ notes: z.array(z.object({ tag: z.enum([...]), pl: z.string(), en: z.string() })).max(5) })`. Default client `new Anthropic()` lazily.
- [ ] Run → PASS. Commit: `feat(changelog): summarizeChangelog (claude-opus-4-8 + fallback)`

---

### Task 6: `runChangelogGenerate` (orchestrator)

**Files:** Create `src/utilities/changelogGenerate.ts`, Test `src/utilities/changelogGenerate.test.ts`

**Consumes:** Tasks 3–5 + `parseCompare`. **Produces:** `runChangelogGenerate(deps): Promise<{ created:boolean; entryId?:string; prCount:number; notes:Note[] }>` where `deps = { payload, fetchCompare(lastSha):Promise<CompareResult>, fetchPullsForCommit(sha):Promise<PR[]>, summarize }` (all injectable).

- [ ] Write failing tests: (a) `lastSha == headSha` → `{created:false, prCount:0}`, no write; (b) PRs all filtered out → `{created:false}`, no write; (c) happy path → `payload.updateGlobal` called twice (pl then en, ids reused), entry has `date`, `toSha=headSha`, notes; returns `created:true`.
- [ ] Run → FAIL.
- [ ] Implement: read `lastSha` from newest entry `toSha` (or `CHANGELOG_SEED_SHA`); `fetchCompare`; if head==lastSha → no-op; gather PRs via `fetchPullsForCommit` per merge commit, dedupe by number; `selectChangelogPRs`; if empty → no-op; `summarize`; build entry; two-pass `updateGlobal` (pl → capture ids → en). Use `overrideAccess:true`.
- [ ] Run → PASS. Commit: `feat(changelog): runChangelogGenerate orchestrator`

---

### Task 7: `POST /api/changelog/generate` endpoint

**Files:** Create `src/app/(frontend)/api/changelog/generate/route.ts`, Test `src/app/(frontend)/api/changelog/generate/route.test.ts`

**Consumes:** `runChangelogGenerate`, real fetchers (GitHub + Payload). **Produces:** secret-gated POST.

- [ ] Write failing tests: no/invalid `?secret` → 401; valid secret → 200 with `{ created, prCount, notes }` (orchestrator mocked).
- [ ] Run → FAIL.
- [ ] Implement: `dynamic='force-dynamic'`; `authed(req)` copied from brevo webhook (HMAC timingSafe, `?secret=` or `x-changelog-secret`, env `CHANGELOG_WEBHOOK_SECRET`); on POST → call orchestrator with real GitHub fetchers (`fetch` to `api.github.com` with `Authorization: Bearer GITHUB_TOKEN`, `Accept: application/vnd.github+json`) + real payload client; always 200 on authed; catch → 200 `{created:false, error}` (avoid Coolify retry storm), log.
- [ ] Run → PASS. Commit: `feat(changelog): secret-gated generate endpoint`

---

### Task 8: `GET/PATCH /api/external/changelog` (corrections furtka)

**Files:** Create `src/app/(frontend)/api/external/changelog/route.ts`, Test `...changelog/route.test.ts`

**Produces:** Bearer `EXTERNAL_API_TOKEN` read/replace of `entries`, mirroring `api/external/roadmap/route.ts`.

- [ ] Write failing tests mirroring roadmap route test (auth required; GET returns `{entries}`; PATCH replaces with id-matching locale recipe).
- [ ] Run → FAIL.
- [ ] Implement by copying `api/external/roadmap/route.ts`, swapping `roadmap`→`changelog`, `items`→`entries`.
- [ ] Run → PASS. Commit: `feat(changelog): external API GET/PATCH`

---

### Task 9: `ChangelogView` + `groupByDate` + css

**Files:** Create `src/components/Changelog/ChangelogView.tsx`, `groupByDate.ts`, `changelog.css`

**Consumes:** `Changelog` type + i18n. **Produces:** `ChangelogView({ entries, locale })` rendering newest-first, notes with tag chips; filtered upstream by page.

- [ ] Create `groupByDate.ts`: sort entries desc by `date`, format header per locale (`pl-PL`/`en-US`).
- [ ] Create `ChangelogView.tsx`: mirror `RoadmapView` structure — `.shell.changelog`, head (`changelog.title`/`lead`), empty state, list of entries (date heading + notes `<li>` with `.changelog__chip--<tag>` + `t('changelog.tag.<tag>')`).
- [ ] Create `changelog.css`: clone `roadmap.css` class shapes (`.changelog`, `__head`, `__lead`, `__entry`, `__date`, `__note`, `__chip` + per-tag colors using theme vars: apps→accent, courses→hybrid, platform→decision, security→gate).
- [ ] Commit: `feat(changelog): ChangelogView + css`

---

### Task 10: apps + courses pages + nav links

**Files:** Create `src/app/apps-app/changelog/page.tsx`, `src/app/courses-app/changelog/page.tsx`; Modify `src/app/apps-app/_components/Nav.tsx`, `src/app/courses-app/_components/Nav.tsx`

**Consumes:** `ChangelogView`, global `changelog`. **Produces:** `/changelog` on both hosts + nav links.

- [ ] Create both pages (mirror `roadmap/page.tsx`): `force-dynamic`, `generateMetadata` → `t('changelog.meta')`, `findGlobal({slug:'changelog', locale})`; filter entries' notes by surface tag set (apps: `platform|apps|security`; courses: `platform|courses|security`); drop entries with no surviving notes; `<ChangelogView entries={filtered} locale={locale} />`.
- [ ] Add `<Link href={getLocalizedPath('/changelog', locale)}>{t(locale,'apps.nav.changelog')}</Link>` to AppsNav `.nav__links`; same with `courses.nav.changelog` in courses Nav.
- [ ] Commit: `feat(changelog): apps+courses pages + nav links`

---

### Task 11: Verify + handoff

- [ ] `pnpm generate:types` (idempotent), `pnpm lint`, `pnpm vitest run` (unit), `pnpm build`.
- [ ] If DB up: `pnpm test:int`.
- [ ] Smoke pages via Playwright (apps/courses host header) — `/changelog` 200, renders empty state.
- [ ] Append a note to `docs/HANDOFF.md` (new feature) + memory pointer.
- [ ] Open PR `feat/public-changelog` → `main` with owner-action checklist (3 secrets + Coolify deploy webhook / GH Action fallback).

## Self-Review

- Spec coverage: model (T1), pipeline select/parse/summarize/orchestrate (T3–6), endpoint+trigger (T7), render+surfaces+filter (T9–10), external furtka (T8), i18n (T2), testing (each task TDD), owner actions (T11/PR). ✅
- Placeholders: none — code given for pure functions/schema/config; boilerplate (pages/global) mirrors named existing files. 
- Type consistency: `PR`, `Note`, `CompareResult` defined in T3/T5/T4 and consumed in T6/T7 with matching names; `tag` enum identical across config (T1), summarize (T5), view (T9).
