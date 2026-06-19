# Lead capture & free lead-magnets — design

> **Date:** 2026-06-19. Approved via brainstorming. Two features that turn the
> store into a list-building engine: (A) add buyers to a Brevo list on purchase,
> (B) give away a free app/course in exchange for a (double-opted-in) email.
> Both use **Brevo native double opt-in**; lead-magnet access is granted **on
> confirmation**. One Brevo list (id **12**, "devince — odbiorcy") + contact
> attributes for segmentation.

## Locked decisions
- **Consent = Brevo double opt-in (DOI).** Brevo holds the auditable opt-in record.
- **Lead-magnet access happens on confirmation** — the confirm click adds to the
  list AND unlocks the product.
- **One list** (`BREVO_LIST_ID=12`) + attributes `SOURCE` (`purchase`|`leadmagnet`),
  `PRODUCT` (slug), `SURFACE` (`apps`|`courses`).
- Owner creates the **DOI template** in Brevo → gives a `BREVO_DOI_TEMPLATE_ID`.
  Until set, the feature is a no-op (env-gated, ships dark).

## Reused / existing
- `/api/newsletter/subscribe` already adds a contact to a Brevo list — extract its
  Brevo `/v3/contacts` call into a shared `addBrevoContact`.
- Brevo DOI API: `POST /v3/contacts/doubleOptinConfirmation` with
  `{ email, includeListIds:[listId], templateId, redirectionUrl, attributes }`.
- Existing transactional emails (`sendDownloadLinkEmail`, `sendCourseAccessEmail`),
  fulfillment (`fulfillAppPurchase`, `addProgramToPurchases`), and the
  `download-grants` HMAC-token pattern (`downloadToken.ts`).

## Architecture

### Shared utils (`src/utilities/brevoContacts.ts`)
- `addBrevoContact(email, listId, attributes?)` — `POST /v3/contacts` (upsert), best-effort.
- `brevoDoubleOptin({ email, listId, templateId, redirectionUrl, attributes })` —
  `POST /v3/contacts/doubleOptinConfirmation`; best-effort; no-op if `templateId` unset.

### Claim token (`src/utilities/claimToken.ts`) — the security boundary
A lead-magnet confirm grants FREE access, so the token must be unforgeable +
single-use + delivered only to the email owner (via Brevo's DOI email → our
`redirectionUrl`).
- `signClaim({ kind:'app'|'course', itemId, email })` → `<payload-b64>.<HMAC-SHA256>`
  signed with a server-only secret (new `CLAIM_TOKEN_SECRET`, like the download HMAC).
- `verifyClaim(token)` → the payload or null (timing-safe compare).
- Single-use: a `claim-grants` collection (or reuse `stripe-events`-style marker)
  records consumed tokens; the confirm route refuses a re-used token.
- The token rides in the DOI `redirectionUrl` we pass to Brevo, so it reaches ONLY
  the person who clicks Brevo's confirmation link (the email owner) — same trust
  model as magic-link/download.

### Feature A — buyers → list (post-purchase DOI)
- **Checkout UI:** add a separate, **unticked** "Chcę newsletter" checkbox to the
  paid buy controls (`CourseCheckoutButton`, apps `BuyButton`), distinct from the
  Art.38 consent.
- **Plumbing:** the checkout routes (`/api/courses/checkout`, `/api/apps/checkout`)
  accept `newsletter:boolean` and stamp `metadata.newsletter='true'` on the Stripe
  session when set.
- **Webhook:** after the durable grant (best-effort), if `metadata.newsletter==='true'`,
  call `brevoDoubleOptin({ email, listId:BREVO_LIST_ID, templateId, redirectionUrl:
  <store-home>, attributes:{SOURCE:'purchase', PRODUCT:slug, SURFACE} })`. The buyer
  gets a "confirm newsletter" email; clicking joins the list. Never blocks/breaks the
  grant (notify-style best-effort).

### Feature B — lead magnet (free-for-email)
- **New fields** on `Products` (apps) + `Program` (courses):
  `accessMode: 'paid' | 'lead-magnet'` (default `'paid'`). Migration additive.
  (`pricing`/`priceCents` stay for paid; lead-magnet ignores price.)
- **UI:** when `accessMode==='lead-magnet'`, the buy control renders an **email
  capture form** (`LeadMagnetForm`) instead of the buy button — email input +
  submit + a clear note "podaj email → potwierdź w mailu → dostajesz X i dołączasz
  do listy".
- **Claim route** `POST /api/apps/free-claim` + `POST /api/courses/free-claim`
  (or one `/api/free-claim` with `{ surface, slug, email }`): validate the item is
  `accessMode:'lead-magnet'` + published; build `token=signClaim({kind, itemId, email})`;
  call `brevoDoubleOptin({ email, listId, templateId, redirectionUrl:
  `${host}/claim/confirmed?grant=${token}`, attributes:{SOURCE:'leadmagnet', PRODUCT:slug, SURFACE} })`.
  Return 200 "sprawdź mail". (No access yet.)
- **Confirm route** `GET /claim/confirmed?grant=<token>` (the Brevo DOI
  `redirectionUrl`): `verifyClaim` → if invalid/used → friendly error page; else mark
  used → grant access (apps: `fulfillAppPurchase`-style DownloadGrant; courses:
  find/create user + `addProgramToPurchases` + forgotPassword token) → send the
  access email (download link / set-password) → render "dostęp odblokowany, sprawdź
  mail". Best-effort email (grant durable first). Brevo has ALREADY added the contact
  to the list by the time it redirects here, so list-join + access are the same click.

### Config (env-gated)
| Env | Where | Purpose |
|---|---|---|
| `BREVO_LIST_ID` | runtime | the list (default/seed `12`) |
| `BREVO_DOI_TEMPLATE_ID` | runtime | owner's Brevo DOI template id (unset → DOI no-op) |
| `CLAIM_TOKEN_SECRET` | runtime | HMAC secret for claim tokens (controller generates + sets) |
Unset DOI template → newsletter/lead-magnet DOI is a no-op (ships dark). Lead-magnet
claim with no template → the form would 200 but no email; so the lead-magnet UI should
only be enabled when the template is configured (or document it).

### Legal
Update Polityka Prywatności (PL+EN): newsletter/marketing processing via Brevo with
**double opt-in**, the contact attributes stored, and the unsubscribe right. The
lead-magnet exchange (email for free content) named.

## Security notes (lead magnet = free access)
- The claim token is the ONLY thing that grants free access at `/claim/confirmed`;
  it's HMAC-signed (unforgeable), single-use (consumed marker), and only ever reaches
  the email owner via Brevo's DOI email. Hitting `/claim/confirmed` without a valid
  signed+unused token → no grant.
- Rate-limit the free-claim route (per IP/email) to stop someone spamming DOI emails
  to arbitrary addresses (email-bomb). Reuse the apps/courses checkout's posture.
- Validate the item is actually `lead-magnet` + published server-side (don't trust the
  client to make a paid item free).

## Scope
Apps + courses both (same pattern). NDQS lead-magnet = out of scope (separate stack).

## Testing
TDD: `signClaim`/`verifyClaim` (forge-resistant, single-use), the free-claim route
(rejects non-lead-magnet, rate-limited, calls DOI with the right token/list),
the confirm route (invalid/used token → no grant; valid → grant + email), the webhook
newsletter branch (DOI only when checkbox set, best-effort). Build + smoke.

## Out of scope (v1)
NDQS lead-magnets · per-product lists (using one list + attributes) · welcome-email
automation (Brevo handles via the list).
