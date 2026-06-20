# Course & Digital-Products Platform — sellable boilerplate product (design)

> **Date:** 2026-06-20. Approved via brainstorming. Goal: extract a CLEAN,
> genericized boilerplate from the devince.dev codebase and sell it as a
> downloadable product on `apps.devince.dev`. The boilerplate = the full
> course + digital-products platform (courses + apps store + marketing site +
> blocks + external API + Stripe + themes + i18n) **minus NDQS**. Recon
> (2026-06-20) confirmed: no secrets in tracked files, NDQS cleanly isolated,
> the core is genuinely generic; the work is mostly **rebranding**, ~1–2 days.

## Locked decisions
- **Scope:** full platform minus NDQS. Include courses-app, apps-app, main
  `(frontend)` site, `src/blocks/*` (incl. `course/*`), all generic collections
  (Program, Lessons, LessonProgress, Products, DownloadGrants, CourseAssets,
  AppAssets, ClaimGrants, Media, Users, StripeEvents, Categories), globals
  (SiteSettings/Header/Footer), the external content API, the Stripe courses/apps
  branches, the three themes, i18n (PL/EN), middleware host-rewrite, Brevo/notify
  (env-gated, ship-dark), Docker/compose. **Exclude NDQS entirely.**
- **License:** commercial, **unlimited own projects** (personal + commercial),
  **no resale/redistribution of the boilerplate itself**. Standard
  ShipFast/Makerkit-style single-purchase license.
- **The live `devince.dev` repo is NEVER modified.** The boilerplate is produced
  in a **separate clean copy** at `/home/bartek/main-projects/course-platform-starter/`.
- **Delivery:** a **zip** sold via `apps.devince.dev` (existing one-time-payment →
  HMAC download-grant → emailed link → streamed file infra). The zip ships
  **without `.git`** (fresh `git init`, no devince history/process leaked) and
  without `node_modules`/`.next`/`.env`.
- **Branding:** replace hardcoded "Devince" with `NEXT_PUBLIC_SITE_NAME` (read in
  layouts/footer/meta); the buyer sets their name in one env var. Email fallbacks
  → `support@example.com`. Hardcoded prod URLs → `NEXT_PUBLIC_*_URL` envs.
- **Legal:** the boilerplate ships a `LEGAL_TEMPLATE.md` + instructions, NOT
  devince's actual Polityka/Regulamin (jurisdiction-specific = buyer's job).
- **Demo:** the live `courses.devince.dev` / `apps.devince.dev` ARE the demo,
  referenced from the product landing.
- **Marketing/product name + price:** the owner finalizes at listing time. The
  boilerplate's default `SITE_NAME` is a neutral placeholder (e.g. "Acme
  Academy"). Working product name in docs: "Course & Digital-Products Platform —
  Payload + Next.js starter".

## Current state (grounding — from recon)
- **Secret-safe:** `.env` gitignored + not tracked; no `sk_*`/`whsec_`/`xkeysib-`/
  real tokens in tracked files (only fake test values + `admin123` demo seed pw).
  Only PII to scrub: `bartek@devince.dev` / "Bartłomiej Filipiuk" in `.env.example`,
  `src/legal/content.ts`, `src/utilities/brevo.ts` fallback, seed, a comment.
- **NDQS (delete):** `src/utilities/ndqsEnroll.ts`, `ndqsRevoke.ts` + their
  `.test.ts`; the `ndqsCourseId` branch in `src/app/(frontend)/api/stripe/webhook/
  route.ts` (+ its webhook-test mocks); NDQS envs in `.env.example`/docs.
- **Hardcoded devince URLs:** `src/middleware.ts` (the two `https://courses.
  devince.dev` / `https://apps.devince.dev` redirect fallbacks) — env-ize. The
  webhook redirect fallbacks are already env-gated (just neutralize the fallback).
- **Branding strings:** ~30 "Devince" in `src/i18n/translations.ts` (meta titles,
  footer tagline incl. "Claude Code"), seed copy in `src/endpoints/seed/index.ts`.
- **Internal artifacts to drop:** `docs/superpowers/`, `docs/HANDOFF.md`,
  `docs/PRO-READINESS-BACKLOG.md`, `docs/PHASE3-OPS-RUNBOOK.md`,
  `docs/PLATFORM-OVERVIEW.md`, `docs/MCP_SERVER.md`, NDQS handoff docs,
  `COurses-handoff/` + `.zip`, root `Polityka Prywatności.md` / `Regulamin
  Serwisu.md`, `scripts/*.sql` (prod fixes), the stray `src/migrations/
  20260618_200715_program_price.json`, `.coolify.env`, any `*.jsonl`.

## Architecture / work breakdown
The project is a **genericization sprint on a copy**, then **package + list**.

### Phase 1 — clean copy (live repo untouched)
- Create `/home/bartek/main-projects/course-platform-starter/` from the current
  devince working tree, EXCLUDING `.git`, `node_modules`, `.next`, `.env`,
  build artifacts. Fresh `git init` in the copy. All subsequent edits happen
  ONLY in the copy. (Devince stays as-is — verified by a no-diff check at the end.)

### Phase 2 — strip NDQS
- Delete the 4 NDQS files; remove the `ndqsCourseId` webhook branch + its test
  mocks; remove NDQS envs from `.env.example`. Confirm the courses/apps webhook
  branches + their tests still pass.

### Phase 3 — de-brand + env-ize
- `middleware.ts`: the two hardcoded course/apps redirect URLs → `NEXT_PUBLIC_
  COURSES_URL` / `NEXT_PUBLIC_APPS_URL` (with neutral `*.example.com` fallbacks).
- `i18n/translations.ts`: replace "Devince"-baked strings so the site name comes
  from `NEXT_PUBLIC_SITE_NAME` (interpolate `{site}` in meta/footer keys, fill via
  the env at render); drop the "Claude Code" tagline → neutral.
- `brevo.ts` + `.env.example`: sender fallbacks → `support@example.com` /
  `{{ SITE_NAME }}`.
- `src/legal/content.ts`: genericize or stub (no devince email/domains).

### Phase 4 — neutral demo seed
- `src/endpoints/seed/index.ts`: replace devince portfolio/courses copy with a
  neutral demo (Home/About/Services/Contact pages, ONE demo course with 1–2
  phases + a few lessons, ONE demo apps product). Keep `admin@example.com` /
  `admin123` demo creds. The demo must seed cleanly and showcase the platform.

### Phase 5 — docs, license, README
- DELETE all internal artifacts (Phase listed above).
- Write: `README.md` (what it is, stack, quick start), `SETUP.md` (prereqs:
  Node/pnpm/Postgres/Stripe/optional Brevo; env table; run/seed/deploy — generic
  Docker + a short Coolify note), `LICENSE` (the locked commercial terms),
  `LEGAL_TEMPLATE.md` (how to add your own Polityka/Regulamin), a cleaned
  `.env.example` (every var documented, no devince values).

### Phase 6 — verify (the safety gates)
- `pnpm install && pnpm build` succeeds in the copy.
- `pnpm test:int` green (generic tests pass; NDQS tests gone).
- Fresh seed smoke: `docker compose up -d` + migrate + seed → courses/apps/main
  render with the neutral demo, no "Devince" anywhere.
- **Leak scrub (hard gate):** grep the FINAL tree for `devince`, `Devince`,
  `bartek`, `Filipiuk`, `ndqs`, `NDQS`, `learn.devince`, `67projects`, `qaci`,
  `sk_live`, `whsec_`, `xkeysib`, real prod hostnames → MUST be empty (or only in
  the buyer-facing `*.example.com` placeholders). Confirm no `.git`, no `.env`,
  no `node_modules` will be in the zip.

### Phase 7 — package + list
- Produce `course-platform-starter-v1.0.0.zip` (the clean tree, excludes above).
- **List on apps.devince.dev** via the external API (owner-gated content/price):
  upload the zip as a private app-asset → create a Product (title, description/
  landing, `priceCents`, `downloadFiles=[asset]`) → publish. Owner sets the final
  price + marketing copy. (This step may be done by the owner or by me on request
  — it's a content/pricing action, not code.)

## Security notes
- The boilerplate is handed to paying strangers → the Phase 6 leak scrub is a
  hard gate, not a nicety. No secrets (already clean), no PII, no prod URLs, no
  NDQS, no internal docs, **no `.git` history** (which could contain old commits /
  reveal process), no `.env`.
- The demo `admin123` credential is intentional + documented as "change before
  production" in SETUP.md.

## Testing
- Build + `test:int` green in the copy.
- Fresh-seed smoke (the demo renders, no devince branding).
- The leak-scrub grep returns clean.
- A "devince repo untouched" check: `git status` in the live repo shows no new
  tracked changes from this work.

## Out of scope (v1)
- Multi-tenancy / SaaS. Git-repo-access delivery (zip only for v1). Automated
  license enforcement. Video walkthrough/marketing site (the live demo + landing
  suffice). Translating docs beyond EN. The actual price + final marketing name
  (owner sets at listing).

## Global constraints
- **Live `devince.dev` repo is never modified** — all genericization happens in
  the separate copy `/home/bartek/main-projects/course-platform-starter/`.
- The copy uses a **fresh `git init`** (no devince history shipped).
- Schema/migrations in the copy stay as Payload generated them (the buyer runs
  migrate on their own DB); do not invent new migrations here.
- The spec + plan (this planning) live in the devince repo's `docs/superpowers/`
  (internal; they do NOT ship in the boilerplate).
- Bash: don't end a command with `pkill`/`kill`; never `pkill -f 'next dev'`.
