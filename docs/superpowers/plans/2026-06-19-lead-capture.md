# Lead capture & lead-magnets — implementation plan

> Spec: `docs/superpowers/specs/2026-06-19-lead-capture-design.md`. Branch
> `feat/lead-capture`. Env values ready: `BREVO_LIST_ID=12`, `BREVO_DOI_TEMPLATE_ID=1`
> (Brevo default DOI template), `CLAIM_TOKEN_SECRET` (controller generates). All
> env-gated → ships dark; the controller sets the envs at deploy.

**Global constraints**
- Money/access-critical: the lead-magnet confirm grants FREE access. The claim token
  is the security boundary — HMAC-signed, single-use, only delivered to the email
  owner via Brevo's DOI email. `/claim/confirmed` with no valid+unused token → NO grant.
- All Brevo calls best-effort (never throw out of the webhook/checkout). DOI is a no-op
  when `BREVO_DOI_TEMPLATE_ID` unset.
- Server-side validation: an item is lead-magnet/published only per the DB record, never
  the client. The free-claim route is rate-limited (anti email-bomb).
- Schema via migration (`push:false`). Tests: `pnpm test:int`. Never `git add -A`.

## PART A — buyers → Brevo list (smaller, lower-risk)

### A1 — Brevo contact utils (TDD)
`src/utilities/brevoContacts.ts`:
- `addBrevoContact(email, listId, attributes?)` — `POST https://api.brevo.com/v3/contacts` with `api-key`, `{ email, listIds:[listId], attributes, updateEnabled:true }`. Best-effort (try/catch, never throws). Extract the existing logic from `src/app/(frontend)/api/newsletter/subscribe/route.ts` and have that route call the util (DRY).
- `brevoDoubleOptin({ email, listId, templateId, redirectionUrl, attributes? })` — `POST /v3/contacts/doubleOptinConfirmation` `{ email, includeListIds:[listId], templateId, redirectionUrl, attributes, updateEnabled:true }`. No-op + log if `templateId` falsy. Best-effort.
TDD: mock `fetch`; assert correct URL/headers/body; never-throws on fetch reject; DOI no-op without templateId.

### A2 — newsletter checkbox + checkout plumbing
- `CourseCheckoutButton.tsx` + apps `BuyButton.tsx`: add a separate, unticked `newsletter` checkbox (label "Chcę dostawać newsletter (oddzielne od zakupu)"), send `newsletter:boolean` in the POST body. i18n keys `*.checkout.newsletter` (pl+en parity).
- `/api/courses/checkout` + `/api/apps/checkout`: read `newsletter` (boolean); when true, add `newsletter:'true'` to the Stripe session `metadata`. Do NOT let it affect price/consent.

### A3 — webhook: DOI on newsletter opt-in
In `api/stripe/webhook/route.ts`, after the durable grant in the courses + apps branches (best-effort, like notifyEvent), if `session.metadata?.newsletter === 'true'` and `email`: `await brevoDoubleOptin({ email, listId: Number(process.env.BREVO_LIST_ID), templateId: process.env.BREVO_DOI_TEMPLATE_ID, redirectionUrl: <store home>, attributes:{ SOURCE:'purchase', PRODUCT: slug, SURFACE: 'courses'|'apps' } })`. Never blocks/breaks the grant. (NDQS branch: skip — out of scope.)

### A4 — legal + config
- `src/legal/content.ts` (pl+en): newsletter/marketing via Brevo with **double opt-in**, the stored attributes, unsubscribe right; name the lead-magnet exchange (for Part B too).
- No code config object needed (read `process.env` directly); document the 3 envs in the report.

## PART B — lead magnets (free-for-email, security-sensitive)

### B1 — claim token (TDD, security boundary)
`src/utilities/claimToken.ts` (model on `downloadToken.ts`):
- `signClaim({ kind, itemId, email })` → `<base64url(json)>.<HMAC-SHA256(payload, CLAIM_TOKEN_SECRET)>`. `kind ∈ 'app'|'course'`.
- `verifyClaim(token)` → the parsed payload `{kind,itemId,email}` or `null`; timing-safe compare; tolerate malformed input (no throw).
TDD: round-trips; a tampered payload/sig → null; wrong-secret → null; garbage → null.

### B2 — claim-grants collection (single-use marker) + migration
`src/collections/ClaimGrants.ts`: fields `token` (text, unique-indexed), `kind`, `itemId`, `email`, `claimedAt`. `access` admin-only (server writes via overrideAccess). Add to payload.config. `pnpm generate:types` + `DATABASE_URI=<dev> pnpm payload migrate:create claim_grants` (additive) + apply.

### B3 — `accessMode` field on Products + Program + migration
Add `accessMode: select 'paid'|'lead-magnet'` (default `'paid'`) to `src/collections/Products/index.ts` and `src/collections/Program/index.ts` (admin description). Regenerate types + migration `access_mode` (additive ADD COLUMN). For courses, lead-magnet ignores price; for apps likewise.

### B4 — free-claim routes (TDD, rate-limited)
`src/app/(frontend)/api/free-claim/route.ts` (one route, body `{ surface:'apps'|'courses', slug, email }`):
- Validate email shape; rate-limit per IP+email (reuse a simple in-route limiter or the project's pattern — cap e.g. 3/min/IP) to stop DOI email-bombing.
- Load the item by slug (`overrideAccess:false`, published only). 404 if missing. 400 if `accessMode !== 'lead-magnet'`.
- `token = signClaim({ kind: surface==='apps'?'app':'course', itemId: String(item.id), email })`.
- `await brevoDoubleOptin({ email, listId, templateId, redirectionUrl: `${HOST}/claim/confirmed?grant=${encodeURIComponent(token)}`, attributes:{ SOURCE:'leadmagnet', PRODUCT: slug, SURFACE: surface } })`.
- Return 200 `{ ok:true }` (always neutral — no email enumeration). If templateId unset → 503 "lead magnets not configured".
TDD: non-lead-magnet → 400; unknown → 404; valid → DOI called with the signed token + leadmagnet attrs; rate-limit returns 429.

### B5 — confirm route (TDD, the grant)
`src/app/(frontend)/api/claim/confirm/route.ts` (and a thin page `/claim/confirmed` that calls it, OR do it in a route handler that renders). The Brevo `redirectionUrl` points at `/claim/confirmed?grant=<token>`:
- `verifyClaim(grant)` → invalid → render a friendly "link nieprawidłowy" page.
- Single-use: try-create a `claim-grants` row with the token (unique index); if it already exists → "już wykorzystany" page (idempotent, no double-grant).
- Grant: `kind==='app'` → create a DownloadGrant for the product (reuse `fulfillAppPurchase`'s grant-creation, or a shared helper) → `sendDownloadLinkEmail`. `kind==='course'` → find/create user (roles:['customer']) → `addProgramToPurchases` → forgotPassword token → `sendCourseAccessEmail` with `&next=/<slug>`. Best-effort email (grant durable first).
- Render "✅ dostęp odblokowany — sprawdź mail". (Brevo has already added the contact to the list before redirecting here.)
TDD: invalid token → no grant; reused token → no second grant; valid app token → DownloadGrant + email; valid course token → purchases + set-password email.

### B6 — lead-magnet UI (email capture)
`src/app/.../components/LeadMagnetForm.tsx` (one shared client component, or per-surface): email input + submit → `POST /api/free-claim {surface, slug, email}` → on ok show "📧 sprawdź mail, potwierdź zapis, żeby odebrać". In `CourseCheckoutButton`/`CourseCard`/`SyllabusHero`/`CtaBand` (courses) + apps product page/`BuyButton`: when `item.accessMode === 'lead-magnet'`, render `<LeadMagnetForm>` instead of the paid buy control. i18n keys (pl+en). Course-themed / apps-themed classes.

### B7 — verify + build
`pnpm test:int` (all new TDD + i18n parity) + `pnpm build`. Migrations applied locally.

## Execution
Part A first (implementer + opus review) — lower risk, ships the list-building.
Then Part B (implementer + **opus security review** focused on: claim token unforgeable + single-use, `/claim/confirmed` can't grant without a valid token, free-claim rate-limited + server-validates lead-magnet, no free-access bypass). Controller sets `BREVO_LIST_ID=12` + `BREVO_DOI_TEMPLATE_ID=1` + a generated `CLAIM_TOKEN_SECRET` in Coolify, then deploys. Owner can later swap a branded DOI template (env).
