# CLAUDE.md — devince.dev platform

Live production platform (started from a Payload boilerplate, no longer a blank
canvas): ONE Next.js 15 + Payload CMS 3.x + PostgreSQL app in one container
serving three faces, routed by host in `src/middleware.ts`:

| Host | What | Route tree |
|---|---|---|
| devince.dev | marketing site (pages/posts/projects, pl/en) | `src/app/(frontend)/[locale]/` |
| courses.devince.dev | course store + player (accounts, paywall) | `src/app/courses-app/` |
| apps.devince.dev | downloadable products store (no accounts) | `src/app/apps-app/` |
| /admin (shared) | Payload admin + REST/GraphQL | `src/app/(payload)/` |

Latest state + deploy details: `docs/HANDOFF.md`. Sales flows across all
products (incl. the separate NDQS repo behind learn.devince.dev):
`docs/PLATFORM-OVERVIEW.md`.

## Commands

```bash
docker compose up -d       # local Postgres (host port 5436 -> 5432)
pnpm dev                   # dev server on http://localhost:3010
pnpm build                 # production build (this is also the type gate)
pnpm lint                  # ESLint
pnpm test:int              # vitest unit/route tests (src/**/*.test.ts)
pnpm test:e2e              # Playwright (needs a running app)
pnpm generate:types        # regenerate src/payload-types.ts after schema edits
pnpm payload migrate       # run DB migrations (deploy does this fail-fast)
pnpm check:security        # pnpm audit + outdated + osv-scanner snapshot
```

Env vars: local `.env` (template `.env.example`); Stripe/Brevo/external-API
secrets live in Coolify, not in the repo.

## Mapa terenu (2026-07-06)

### Architektura
- Host routing + locale: `src/middleware.ts` rewrites courses.* → `/courses-app`,
  apps.* → `/apps-app`; main host gets `[locale]` handling (pl default, en —
  `src/i18n/config.ts`).
- Data schema = collections in `src/collections/` (registered in
  `src/payload.config.ts`): `Program` + `Lessons` (courses), `Products` +
  `DownloadGrants` + `ClaimGrants` (apps store), `Users` (auth + `purchases`),
  `Pages`/`Posts`/`Projects` + `Categories.ts`, `Media.ts` + private
  `AppAssets`/`CourseAssets`, `StripeEvents` (webhook idempotency),
  `LessonProgress.ts`.
- Globals: `src/Header/`, `src/Footer/`, `src/SiteSettings/`, `src/Changelog/`,
  `src/Roadmap/`.
- Page building: blocks in `src/blocks/<Name>/config.ts` (schema) +
  `Component.tsx` (structural render), assembled by `src/blocks/RenderBlocks.tsx`.
  ALL visual identity lives in theme files: `src/app/(frontend)/theme.css`,
  `src/app/courses-app/course-theme.css`, `src/app/apps-app/app-theme.css`.
- Access control: `src/access/` (`enrolledOrAdmin.ts`, `adminOnly.ts`,
  `authenticatedOrPublished.ts`).
- Services/business logic: `src/utilities/` (fulfillment, Brevo email, claim &
  download tokens, course progress, checkout line items).
- External content API (Bearer `EXTERNAL_API_TOKEN`):
  `src/app/(frontend)/api/external/` — route table in `docs/EXTERNAL-CONTENT-API.md`.
- MCP server (separate deployable wrapping that API as MCP tools): `mcp-server/`
  — see `docs/MCP_SERVER.md`.
- DB schema changes ONLY via migrations in `src/migrations/`
  (`push: false` in `src/payload.config.ts`); deploy = Coolify from `main`,
  runs `npx payload migrate && node server.js`.
- Private product files live in `private-media-apps/` (outside `public/`),
  reachable only through the grant-gated download route.

### Przepływy krytyczne
1. **Content pipeline (agent-driven publishing)**: HTTP client with token →
   `src/app/(frontend)/api/external/programs/route.ts` (same shape for
   posts/products/lessons/pages/projects/media/roadmap/changelog) → auth
   `api/external/_lib/auth.ts` (timing-safe Bearer) → validation +
   `_lib/payload.ts` → Payload local API (`collection: 'program'`) → Postgres →
   JSON via `_lib/errors.ts`.
2. **Apps store purchase**: product page → `POST
   src/app/(frontend)/api/apps/checkout/route.ts` (consent gate, price ALWAYS
   from DB tier record) → Stripe Checkout →
   `src/app/(frontend)/api/stripe/webhook/route.ts` (`constructEvent` signature
   check, `stripe-events` idempotency, `verifyAmount` reconciliation) →
   `src/utilities/appsFulfillment.ts` creates a DownloadGrant → email via
   `src/utilities/brevo.ts` → `src/app/(frontend)/api/apps/download/[token]/route.ts`
   (`src/utilities/resolveGrant.ts`) streams the file from `private-media-apps/`.
3. **Course purchase + playback**: course page → `POST
   src/app/(frontend)/api/courses/checkout/route.ts` → Stripe → same webhook →
   `src/utilities/purchases.ts` (`addProgramToPurchases`) + set-password email →
   login → `src/app/courses-app/[slug]/learn/[lesson]/page.tsx` queries lessons
   with `overrideAccess: false` so `src/access/enrolledOrAdmin.ts` enforces the
   paywall; progress: `src/app/(frontend)/api/courses/progress/route.ts` →
   `LessonProgress`.
4. **MCP content tools**: MCP client → `mcp-server/src/index.ts` (Express +
   StreamableHTTP, `MCP_AUTH_TOKEN`) → `mcp-server/src/server.ts` registers
   `mcp-server/src/tools/*.ts` → `mcp-server/src/lib/api-client.ts` → this
   app's `/api/external/*` with `EXTERNAL_API_TOKEN`.
5. **Marketing page render**: request → `src/middleware.ts` (host + locale) →
   `src/app/(frontend)/[locale]/[slug]/page.tsx` → Payload query on `pages` →
   `src/blocks/RenderBlocks.tsx` → block components styled by
   `src/app/(frontend)/theme.css`.

### Konwencje (faktyczne, z kodu)
- Tests are colocated `*.test.ts` next to the source, vitest node env
  (`vitest.config.mts`); models: `src/utilities/downloadToken.test.ts` (util),
  `src/app/(frontend)/api/apps/checkout/checkout.test.ts` (route).
- External API errors go through
  `src/app/(frontend)/api/external/_lib/errors.ts`; other routes return plain
  `NextResponse.json({ error }, { status })`. Security-sensitive routes return a
  uniform 403 without leaking state (model:
  `src/app/(frontend)/api/apps/download/[token]/route.ts`).
- Input handling: parse body as `unknown`, narrow each field explicitly;
  price/authz values come from the DB, never the client (model:
  `src/app/(frontend)/api/apps/checkout/route.ts`).
- Types are generated (`src/payload-types.ts`) — never hand-edit; rerun
  `pnpm generate:types` after any collection/block change.
- PAGE docs are the styling/content conventions — linked, not duplicated here:
  `PAGE_BOILERPLATE.md` (technical reference: blocks, globals, seed data),
  `PAGE_DESIGN.md` (visual spec that drives theme.css),
  `PAGE_DEVTIPS.md` (known issues + quick fixes),
  `PAGE_DESCRIPTION.md` (business info source). `SETUP_PROMPT.md` is the
  boilerplate-era customization workflow — historical for this repo.

### Pułapki
- The courses collection slug is `program` (singular —
  `src/collections/Program/index.ts`) while the external route is
  `/api/external/programs` and the UI says "courses".
- There is NO `typecheck` script; `pnpm exec tsc --noEmit` is RED (21 errors,
  all in `*.test.ts` mocks + stale `.next/types`). The real type gate is
  `pnpm build`. Runtime tests all pass.
- Dev port is **3010**, local Postgres is **5436** — older docs claiming
  3000/5433 are stale.
- Never auto-push schema: `push: false`. Any schema change needs a committed
  migration in `src/migrations/` or the fail-fast deploy migrate breaks.
- `src/changelog/` (lowercase: ingest lib, `src/utilities/changelogIngest.ts`
  friends) and `src/Changelog/` (capitalized: global config) both exist — case
  matters.
- Download tokens contain a literal dot (`uuid.hex`); the `PUBLIC_FILE` regex in
  `src/middleware.ts` is deliberately shaped to not treat them as static files —
  do not "simplify" it.
- Tier prices are localized (PL/EN priced independently); checkout reads the
  product at the buyer's locale (`src/app/(frontend)/api/apps/checkout/route.ts`).

### Jak dodać feature (playbook)
1. Read `docs/HANDOFF.md` + the relevant flow above; find the two most similar
   existing features and copy their structure.
2. Schema change → edit/add collection in `src/collections/` (register in
   `src/payload.config.ts`) → `pnpm generate:types` → create a migration.
3. Pick the right surface: marketing → `src/app/(frontend)/[locale]/`, courses
   face → `src/app/courses-app/`, apps face → `src/app/apps-app/`; shared API →
   `src/app/(frontend)/api/`.
4. New block → `src/blocks/X/config.ts` + `Component.tsx`, register in
   `src/collections/Pages/index.ts` + `src/blocks/RenderBlocks.tsx`; style via
   theme.css semantic classes.
5. Content that agents should manage → extend `api/external/` + mirror a tool in
   `mcp-server/src/tools/` + update `docs/EXTERNAL-CONTENT-API.md`.
6. Colocate `*.test.ts`; run Weryfikacja below before claiming done.

### Weryfikacja
- `pnpm test:int` → **43 files, 308 tests passed** (run 2026-07-06, ~3 s).
- `pnpm lint` → **exit 0** (warnings only: `no-explicit-any` / unused vars,
  mostly in tests).
- `pnpm exec tsc --noEmit` → **exit 1, 21 errors** (test-file mocks + stale
  `.next/types`) — known red, see Pułapki; not a regression signal by itself.
- Not run in this pass: `pnpm build`, `pnpm test:e2e` (needs running server),
  `pnpm check:security`.
