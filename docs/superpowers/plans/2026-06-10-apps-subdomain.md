# apps.devince.dev — downloadable-files store — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `apps.devince.dev` storefront selling downloadable files via one-time Stripe Checkout with NO user accounts — fulfillment is an emailed, HMAC-signed, expiring download link that streams files from private storage.

**Architecture:** Same host-rewrite pattern as courses: middleware sends `apps.devince.dev/X` to the real segment `src/app/apps-app/X` (own root layout + `app-theme.css` adapted from `course-theme.css`). Three new collections (`products`, `app-assets`, `download-grants`) added via a Payload migration (`push:false` already). The existing Stripe webhook gains a `metadata.productId` branch that creates a `DownloadGrant` and emails the link via Brevo. A token route validates HMAC + expiry + use-limit and streams bytes from a private dir.

**Tech Stack:** Next.js 15 App Router, Payload 3.67 (collections, migrations), Postgres, Stripe Checkout Sessions, Brevo, vitest. Theme source: `src/app/courses-app/course-theme.css`.

**Spec:** `docs/superpowers/specs/2026-06-10-apps-subdomain-design.md`

**Branch note:** work happens on `feat/apps-subdomain`, stacked on `feat/courses-subdomain` (PR #15) — all reused infra lives there, NOT on main. The PR for this plan targets `feat/courses-subdomain`.

**Env vars introduced:** `DOWNLOAD_TOKEN_SECRET` (required for fulfillment/download), `NEXT_PUBLIC_APPS_URL` (default `https://apps.devince.dev`), `BREVO_DOWNLOAD_TEMPLATE_ID` (optional). Add all three to `.env.example`; add a real `DOWNLOAD_TOKEN_SECRET` (e.g. `openssl rand -hex 32`) to local `.env` for smoke.

---

## File structure (new/changed)

- `src/collections/AppAssets/index.ts` — private upload collection (Task 1)
- `src/collections/DownloadGrants/index.ts` — grants ledger (Task 2)
- `src/collections/Products/index.ts` — sellable products (Task 3)
- `src/payload.config.ts` — register 3 collections (Tasks 1–3)
- `src/migrations/<ts>_apps_store_model.*` — schema migration (Task 4)
- `src/utilities/downloadToken.ts` (+ `.test.ts`) — HMAC sign/verify + grant evaluation (Task 5)
- `src/utilities/checkoutLineItem.ts` (+ `.test.ts`) — Stripe line-item builder (Task 6)
- `src/app/(frontend)/api/apps/checkout/route.ts` — POST create Checkout Session (Task 6)
- `src/utilities/brevo.ts` (+ extend `.test.ts`) — `sendDownloadLinkEmail` (Task 7)
- `src/utilities/appsFulfillment.ts` (+ `.test.ts`) — grant creation, idempotent by session (Task 8)
- `src/app/(frontend)/api/stripe/webhook/route.ts` — `productId` branch (Task 8)
- `src/middleware.ts` — `apps.*` host branch (Task 9)
- `src/app/apps-app/layout.tsx`, `app-theme.css`, `_components/` (Task 10)
- `src/app/apps-app/page.tsx` — storefront (Task 11)
- `src/app/apps-app/[slug]/page.tsx` + `_components/BuyButton.tsx`, `success/page.tsx` (Task 12)
- `src/utilities/resolveGrant.ts` — shared token→grant resolution (Task 13)
- `src/app/(frontend)/api/apps/download/[token]/route.ts` — gated streaming (Task 13)
- `src/app/apps-app/download/[token]/page.tsx`, `not-found.tsx` (Task 14)
- `scripts/seed-app-fixture.ts` — smoke fixture (Task 15)

---

### Task 1: `AppAssets` private upload collection

**Files:** Create `src/collections/AppAssets/index.ts`; modify `src/payload.config.ts`.

- [ ] **Step 1: Write the collection** — copy the pattern from `src/collections/CourseAssets/index.ts` verbatim, changing: slug `app-assets`, staticDir `../../../private-media-apps`, and the doc comment (gated by DownloadGrants, not enrollment):

```ts
import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

import { adminOnly } from '../../access/adminOnly'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Private upload collection for purchased app downloads.
 *
 * Files are stored OUTSIDE the public web root (../../../private-media-apps)
 * and every access op is admin-only. The only delivery path is the
 * grant-gated streaming route /api/apps/download/[token], which verifies the
 * HMAC token + expiry + use-limit and then loads the asset with
 * overrideAccess: true. No public URL is ever exposed.
 */
export const AppAssets: CollectionConfig = {
  slug: 'app-assets',
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    useAsTitle: 'filename',
    hidden: false,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
  upload: {
    staticDir: path.resolve(dirname, '../../../private-media-apps'),
    disableLocalStorage: false,
  },
}
```

- [ ] **Step 2: Register in `src/payload.config.ts`** — import `AppAssets` and add to the `collections: [...]` array (after `CourseAssets`).

- [ ] **Step 3: Add `private-media-apps/` to `.gitignore`** (same as `private-media/` — check it's listed there and mirror).

- [ ] **Step 4: Verify** — run `pnpm generate:types`. Expected: succeeds, `payload-types.ts` gains `AppAsset`.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(apps): AppAssets private upload collection"`

### Task 2: `DownloadGrants` collection

**Files:** Create `src/collections/DownloadGrants/index.ts`; modify `src/payload.config.ts`.

- [ ] **Step 1: Write the collection:**

```ts
import type { CollectionConfig } from 'payload'
import { adminOnly } from '../../access/adminOnly'

/**
 * Purchase-fulfillment grants for app downloads (NO user accounts).
 *
 * Created exclusively by the Stripe webhook (Local API, overrideAccess: true)
 * after checkout.session.completed. The download route resolves tokens
 * server-side with overrideAccess: true. Admin-only for every op — there is
 * no end-user identity that could own these.
 */
export const DownloadGrants: CollectionConfig = {
  slug: 'download-grants',
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: { useAsTitle: 'email', hidden: false, defaultColumns: ['email', 'product', 'expiresAt', 'uses'] },
  fields: [
    { name: 'token', type: 'text', required: true, unique: true, index: true },
    { name: 'product', type: 'relationship', relationTo: 'products', required: true },
    { name: 'email', type: 'text', required: true, index: true },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'maxUses', type: 'number', required: true, defaultValue: 5 },
    { name: 'uses', type: 'number', required: true, defaultValue: 0 },
    // Audit + fulfillment idempotency: one grant per Checkout Session.
    { name: 'stripeSessionId', type: 'text', index: true },
  ],
}
```

- [ ] **Step 2: Register in `payload.config.ts`** (after `StripeEvents`). NOTE: `relationTo: 'products'` won't typecheck until Task 3 registers `Products` — do Tasks 2 and 3 in the same working session and only run `generate:types` after both are registered. (If executing strictly task-by-task, it is fine: `generate:types` is only run in Task 3.)

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat(apps): DownloadGrants collection"`

### Task 3: `Products` collection

**Files:** Create `src/collections/Products/index.ts`; modify `src/payload.config.ts`.

- [ ] **Step 1: Write the collection.** Mirror `Program`'s patterns: `slugField()` from `payload`, drafts/versions block (copy the exact `versions` block from `src/collections/Program/index.ts`), read access `authenticatedOrPublished`, SEO tab using `@payloadcms/plugin-seo/fields` (copy the SEO tab structure from Program — `MetaTitleField`, `MetaImageField`, `MetaDescriptionField`, `PreviewField`, `OverviewField` with the same wiring):

```ts
import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { adminOnly } from '../../access/adminOnly'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
// SEO field imports: copy from src/collections/Program/index.ts

export const Products: CollectionConfig = {
  slug: 'products',
  access: {
    read: authenticatedOrPublished,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'priceCents', '_status'] },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Produkt',
          fields: [
            { name: 'description', type: 'richText' },
            { name: 'coverImage', type: 'upload', relationTo: 'media' },
            {
              type: 'row',
              fields: [
                { name: 'priceCents', type: 'number', required: true, min: 0, admin: { description: 'Cena w groszach (np. 4900 = 49,00 zł)' } },
                {
                  name: 'currency',
                  type: 'select',
                  required: true,
                  defaultValue: 'pln',
                  options: [
                    { label: 'PLN', value: 'pln' },
                    { label: 'EUR', value: 'eur' },
                    { label: 'USD', value: 'usd' },
                  ],
                },
              ],
            },
            {
              name: 'stripePriceId',
              type: 'text',
              admin: { description: 'Opcjonalnie: istniejący Stripe Price. Gdy puste, Checkout używa price_data z priceCents.' },
            },
            {
              name: 'downloadFiles',
              type: 'relationship',
              relationTo: 'app-assets',
              hasMany: true,
              admin: { description: 'Prywatne pliki dostarczane po zakupie.' },
            },
          ],
        },
        // SEO tab: copy structure from Program (MetaTitleField/MetaImageField/etc.)
      ],
    },
    slugField(),
  ],
  versions: {
    // copy the exact drafts/versions options from Program
  },
}
```

(The executor MUST open `src/collections/Program/index.ts` and copy the real SEO-tab block, the `versions` block, and check how `slugField()` is invoked there — keep identical style. If Program's admin block has `livePreview`/`preview` config, SKIP it for products — apps has no preview wiring.)

- [ ] **Step 2: Register in `payload.config.ts`** (after `Projects`).

- [ ] **Step 3: Verify** — `pnpm generate:types`. Expected: succeeds; types `Product`, `DownloadGrant`, `AppAsset` exist. Then `pnpm lint` on changed files passes.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(apps): Products collection (downloadable, drafts, SEO)"`

### Task 4: Migration `apps_store_model`

**Files:** Create `src/migrations/<timestamp>_apps_store_model.ts` + `.json` via CLI; updates `src/migrations/index.ts`.

- [ ] **Step 1: Bring the reference DB up to date** (it has all prior migrations applied; if unsure, re-check status):

```bash
DATABASE_URI=postgres://postgres:postgres@localhost:5436/payload_ref pnpm payload migrate:status
DATABASE_URI=postgres://postgres:postgres@localhost:5436/payload_ref pnpm payload migrate
```
Expected: all existing migrations applied, none pending.

- [ ] **Step 2: Generate the migration:**

```bash
DATABASE_URI=postgres://postgres:postgres@localhost:5436/payload_ref pnpm payload migrate:create apps_store_model
```
Expected: new `src/migrations/<ts>_apps_store_model.ts` creating `products`, `_products_v*` (drafts), `app_assets`, `download_grants` tables + relationship tables. Inspect the `up()` to confirm those tables are there and NOTHING unrelated is dropped/altered destructively.

- [ ] **Step 3: Apply to the ref DB and the dev DB:**

```bash
DATABASE_URI=postgres://postgres:postgres@localhost:5436/payload_ref pnpm payload migrate
DATABASE_URI=postgres://postgres:postgres@localhost:5436/payload pnpm payload migrate
```
Expected: both apply cleanly. (Dev DB URI: check `.env` `DATABASE_URI` — dev db is `payload` on localhost:5436.)

- [ ] **Step 4: Verify dev still boots** — `pnpm test:int`. Expected: all existing tests pass (30/30 at time of writing).

- [ ] **Step 5: Commit** — `git add src/migrations && git commit -m "feat(db): migration apps_store_model (products, app-assets, download-grants)"`

### Task 5: `downloadToken` util (TDD)

**Files:** Create `src/utilities/downloadToken.test.ts`, then `src/utilities/downloadToken.ts`.

- [ ] **Step 1: Write the failing tests:**

```ts
import { describe, expect, it } from 'vitest'
import { createDownloadToken, evaluateGrant, signDownloadToken, verifyDownloadToken } from './downloadToken'

const secret = 'test-secret'

describe('downloadToken sign/verify', () => {
  it('verifies a token it signed', () => {
    const token = signDownloadToken({ nonce: 'abc-123', secret })
    expect(verifyDownloadToken({ token, secret })).toBe(true)
  })
  it('createDownloadToken produces unique, verifiable tokens', () => {
    const a = createDownloadToken(secret)
    const b = createDownloadToken(secret)
    expect(a).not.toBe(b)
    expect(verifyDownloadToken({ token: a, secret })).toBe(true)
  })
  it('rejects a tampered nonce', () => {
    const token = signDownloadToken({ nonce: 'abc-123', secret })
    expect(verifyDownloadToken({ token: 'x' + token, secret })).toBe(false)
  })
  it('rejects a wrong secret', () => {
    const token = signDownloadToken({ nonce: 'abc-123', secret })
    expect(verifyDownloadToken({ token, secret: 'other' })).toBe(false)
  })
  it.each(['', 'no-dot', '.', 'a.', '.abc', 'a.zzzz', 'a.deadbeef'])(
    'rejects malformed token %j without throwing',
    (token) => {
      expect(verifyDownloadToken({ token, secret })).toBe(false)
    },
  )
})

describe('evaluateGrant', () => {
  const now = new Date('2026-06-11T00:00:00Z')
  const future = '2026-06-18T00:00:00Z'
  it('ok when unexpired and under limit', () => {
    expect(evaluateGrant({ expiresAt: future, uses: 0, maxUses: 5 }, now)).toEqual({ ok: true })
  })
  it('expired when expiresAt <= now', () => {
    expect(evaluateGrant({ expiresAt: '2026-06-10T00:00:00Z', uses: 0, maxUses: 5 }, now)).toEqual({ ok: false, reason: 'expired' })
  })
  it('limit when uses >= maxUses', () => {
    expect(evaluateGrant({ expiresAt: future, uses: 5, maxUses: 5 }, now)).toEqual({ ok: false, reason: 'limit' })
  })
})
```

- [ ] **Step 2: Run to verify failure** — `pnpm vitest run src/utilities/downloadToken.test.ts --config ./vitest.config.mts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement:**

```ts
import crypto from 'crypto'

/**
 * HMAC-signed download tokens for account-less purchase fulfillment.
 * Token format: "<nonce>.<hmacSha256Hex(nonce, secret)>".
 * verify runs BEFORE any DB lookup — malformed/forged tokens are rejected
 * cheaply and in constant time (timingSafeEqual).
 */
export function signDownloadToken(args: { nonce: string; secret: string }): string {
  const sig = crypto.createHmac('sha256', args.secret).update(args.nonce).digest('hex')
  return `${args.nonce}.${sig}`
}

export function createDownloadToken(secret: string): string {
  return signDownloadToken({ nonce: crypto.randomUUID(), secret })
}

export function verifyDownloadToken(args: { token: string; secret: string }): boolean {
  const i = args.token.lastIndexOf('.')
  if (i <= 0 || i === args.token.length - 1) return false
  const nonce = args.token.slice(0, i)
  const sigHex = args.token.slice(i + 1)
  const expected = crypto.createHmac('sha256', args.secret).update(nonce).digest()
  const actual = Buffer.from(sigHex, 'hex')
  if (actual.length !== expected.length) return false
  return crypto.timingSafeEqual(actual, expected)
}

export type GrantCheck = { ok: true } | { ok: false; reason: 'expired' | 'limit' }

export function evaluateGrant(
  grant: { expiresAt: string | Date; uses: number; maxUses: number },
  now: Date,
): GrantCheck {
  if (new Date(grant.expiresAt).getTime() <= now.getTime()) return { ok: false, reason: 'expired' }
  if (grant.uses >= grant.maxUses) return { ok: false, reason: 'limit' }
  return { ok: true }
}
```

- [ ] **Step 4: Run tests** — same command. Expected: PASS (all).

- [ ] **Step 5: Commit** — `git add src/utilities/downloadToken.* && git commit -m "feat(apps): HMAC download token sign/verify + grant evaluation (TDD)"`

### Task 6: Checkout — line-item builder (TDD) + route

**Files:** Create `src/utilities/checkoutLineItem.test.ts`, `src/utilities/checkoutLineItem.ts`, `src/app/(frontend)/api/apps/checkout/route.ts`.

- [ ] **Step 1: Failing tests:**

```ts
import { describe, expect, it } from 'vitest'
import { buildLineItem } from './checkoutLineItem'

describe('buildLineItem', () => {
  it('uses stripePriceId when present', () => {
    expect(buildLineItem({ title: 'App', priceCents: 4900, currency: 'pln', stripePriceId: 'price_123' })).toEqual({
      price: 'price_123',
      quantity: 1,
    })
  })
  it('falls back to price_data from priceCents/currency/title', () => {
    expect(buildLineItem({ title: 'App', priceCents: 4900, currency: 'pln', stripePriceId: null })).toEqual({
      price_data: { currency: 'pln', unit_amount: 4900, product_data: { name: 'App' } },
      quantity: 1,
    })
  })
  it('treats empty-string stripePriceId as absent', () => {
    expect(buildLineItem({ title: 'A', priceCents: 100, currency: 'eur', stripePriceId: '' })).toHaveProperty('price_data')
  })
})
```

- [ ] **Step 2: Run → FAIL**, then implement:

```ts
type ProductPricing = {
  title: string
  priceCents: number
  currency: string
  stripePriceId?: string | null
}

export function buildLineItem(product: ProductPricing) {
  if (product.stripePriceId) {
    return { price: product.stripePriceId, quantity: 1 }
  }
  return {
    price_data: {
      currency: product.currency,
      unit_amount: product.priceCents,
      product_data: { name: product.title },
    },
    quantity: 1,
  }
}
```

Run tests → PASS.

- [ ] **Step 3: Checkout route** — `src/app/(frontend)/api/apps/checkout/route.ts` (lazy Stripe init pattern copied from the webhook route):

```ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { buildLineItem } from '@/utilities/checkoutLineItem'

let stripeClient: Stripe | null = null
function getStripe(): Stripe {
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string)
  return stripeClient
}

const APPS_URL = () => process.env.NEXT_PUBLIC_APPS_URL ?? 'https://apps.devince.dev'

export async function POST(req: NextRequest) {
  let slug: unknown
  try {
    ;({ slug } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  if (typeof slug !== 'string' || !slug) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const payload = await getPayload({ config: configPromise })
  // overrideAccess: false + no user => only published products are findable.
  const found = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
  })
  const product = found.docs[0]
  if (!product) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const files = Array.isArray(product.downloadFiles) ? product.downloadFiles : []
  if (!files.length) return NextResponse.json({ error: 'not purchasable' }, { status: 409 })

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [buildLineItem(product)],
    metadata: { productId: String(product.id) },
    success_url: `${APPS_URL()}/success`,
    cancel_url: `${APPS_URL()}/${product.slug}`,
  })
  return NextResponse.json({ url: session.url })
}

export const dynamic = 'force-dynamic'
```

- [ ] **Step 4: Verify** — `pnpm test:int` green; `pnpm lint` on new files clean.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(apps): Stripe Checkout route + line-item builder (TDD)"`

### Task 7: Brevo `sendDownloadLinkEmail`

**Files:** Modify `src/utilities/brevo.ts`; extend `src/utilities/brevo.test.ts`.

- [ ] **Step 1: Read `src/utilities/brevo.ts` + its test** to mirror `sendCourseAccessEmail` exactly (templateId env + params, fallback subject/html via `sendTransactionalEmail`).

- [ ] **Step 2: Add failing test** (mirror the existing test style — mocked `fetch`): asserts that `sendDownloadLinkEmail({ to, link, productTitle })` (a) uses `BREVO_DOWNLOAD_TEMPLATE_ID` + `params: { LINK, PRODUCT }` when the env is set, (b) falls back to a PL subject/html containing the link when not set.

- [ ] **Step 3: Implement** in `brevo.ts`:

```ts
export async function sendDownloadLinkEmail(args: {
  to: string
  link: string
  productTitle: string
}): Promise<void> {
  const templateId = process.env.BREVO_DOWNLOAD_TEMPLATE_ID
  if (templateId) {
    await sendTransactionalEmail({
      to: args.to,
      templateId: Number(templateId),
      params: { LINK: args.link, PRODUCT: args.productTitle },
    })
    return
  }
  await sendTransactionalEmail({
    to: args.to,
    subject: `Twój zakup: ${args.productTitle} — link do pobrania`,
    html: `<p>Dziękujemy za zakup <strong>${args.productTitle}</strong>.</p><p><a href="${args.link}">Pobierz pliki</a></p><p>Link wygaśnie po 7 dniach i ma limit pobrań. Jeśli wygaśnie — odpisz na tego maila.</p>`,
  })
}
```
(Adjust the exact `sendTransactionalEmail` arg names to what `brevo.ts` actually exposes — mirror `sendCourseAccessEmail`.)

- [ ] **Step 4: Run** `pnpm vitest run src/utilities/brevo.test.ts --config ./vitest.config.mts` → PASS. Commit: `git commit -am "feat(apps): Brevo download-link email"`

### Task 8: Fulfillment — webhook `productId` branch (TDD on helper)

**Files:** Create `src/utilities/appsFulfillment.test.ts`, `src/utilities/appsFulfillment.ts`; modify `src/app/(frontend)/api/stripe/webhook/route.ts`.

- [ ] **Step 1: Failing tests** (stubbed Payload Local API — plain objects with `vi.fn()`):

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fulfillAppPurchase } from './appsFulfillment'

const grantRow = { id: 1, token: 't.sig' }

function makePayload(existing: unknown[] = []) {
  return {
    find: vi.fn().mockResolvedValue({ docs: existing }),
    create: vi.fn().mockResolvedValue(grantRow),
  }
}

describe('fulfillAppPurchase', () => {
  beforeEach(() => {
    process.env.DOWNLOAD_TOKEN_SECRET = 'test-secret'
  })
  it('creates a grant with a verifiable token, 7-day expiry, maxUses 5', async () => {
    const payload = makePayload()
    const res = await fulfillAppPurchase(payload as never, {
      productId: 7,
      email: 'a@b.pl',
      sessionId: 'cs_123',
    })
    expect(res.created).toBe(true)
    expect(payload.create).toHaveBeenCalledOnce()
    const data = payload.create.mock.calls[0][0].data
    expect(data.product).toBe(7)
    expect(data.email).toBe('a@b.pl')
    expect(data.stripeSessionId).toBe('cs_123')
    expect(data.maxUses).toBe(5)
    expect(data.uses).toBe(0)
    expect(typeof data.token).toBe('string')
    expect(new Date(data.expiresAt).getTime()).toBeGreaterThan(Date.now())
  })
  it('is idempotent per stripeSessionId (existing grant => no create)', async () => {
    const payload = makePayload([grantRow])
    const res = await fulfillAppPurchase(payload as never, {
      productId: 7,
      email: 'a@b.pl',
      sessionId: 'cs_123',
    })
    expect(res.created).toBe(false)
    expect(payload.create).not.toHaveBeenCalled()
  })
  it('throws when DOWNLOAD_TOKEN_SECRET is unset', async () => {
    delete process.env.DOWNLOAD_TOKEN_SECRET
    await expect(
      fulfillAppPurchase(makePayload() as never, { productId: 7, email: 'a@b.pl', sessionId: 'cs_1' }),
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run → FAIL**, then implement:

```ts
import type { Payload } from 'payload'
import { createDownloadToken } from './downloadToken'

const GRANT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const GRANT_MAX_USES = 5

/**
 * Account-less fulfillment for app purchases: create one DownloadGrant per
 * Checkout Session. Idempotent — re-delivered webhooks for the same session
 * find the existing grant and do nothing.
 */
export async function fulfillAppPurchase(
  payload: Payload,
  args: { productId: number | string; email: string; sessionId: string },
): Promise<{ created: boolean; token?: string }> {
  const existing = await payload.find({
    collection: 'download-grants',
    where: { stripeSessionId: { equals: args.sessionId } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs.length) return { created: false }

  const secret = process.env.DOWNLOAD_TOKEN_SECRET
  if (!secret) throw new Error('DOWNLOAD_TOKEN_SECRET is not set')

  const token = createDownloadToken(secret)
  await payload.create({
    collection: 'download-grants',
    data: {
      token,
      product: args.productId,
      email: args.email,
      expiresAt: new Date(Date.now() + GRANT_TTL_MS).toISOString(),
      maxUses: GRANT_MAX_USES,
      uses: 0,
      stripeSessionId: args.sessionId,
    } as never,
    overrideAccess: true,
  })
  return { created: true, token }
}
```

Run → PASS.

- [ ] **Step 3: Wire into the webhook.** In `src/app/(frontend)/api/stripe/webhook/route.ts`, inside `if (event.type === 'checkout.session.completed')`, after reading `programIdRaw`, add the apps branch (programId branch stays untouched):

```ts
const productIdRaw = session.metadata?.productId

if (email && productIdRaw && !programIdRaw) {
  const productId = Number.isNaN(Number(productIdRaw)) ? productIdRaw : Number(productIdRaw)
  const result = await fulfillAppPurchase(payload, { productId, email, sessionId: session.id })
  if (result.created && result.token) {
    // Best-effort email, same policy as course access mails: a Brevo failure
    // must NOT fail the webhook — the grant exists; admin can resend.
    try {
      const product = await payload.findByID({
        collection: 'products', id: productId, depth: 0, overrideAccess: true,
      })
      const base = process.env.NEXT_PUBLIC_APPS_URL ?? 'https://apps.devince.dev'
      await sendDownloadLinkEmail({
        to: email,
        link: `${base}/download/${result.token}`,
        productTitle: product?.title ?? 'Twój zakup',
      })
    } catch (err) {
      console.error(`[stripe webhook] download email failed for ${email} (product ${productId}); grant exists, continuing:`, err)
    }
  }
}
```
Add imports for `fulfillAppPurchase` and `sendDownloadLinkEmail`.

- [ ] **Step 4: Verify** — `pnpm test:int` all green, `pnpm lint` clean. Commit: `git commit -am "feat(apps): webhook productId branch — grant + download email (TDD)"`

### Task 9: Middleware `apps.*` branch

**Files:** Modify `src/middleware.ts` (+ its test if `src/middleware.test.ts`/similar exists — check; courses logic may have tests).

- [ ] **Step 1: Read the full `src/middleware.ts`** and replicate the courses pattern for apps, point by point:
  1. Add `'/apps-app'` to `EXCLUDED_PREFIXES` (right after `'/courses-app'`, with a mirrored comment).
  2. In the excluded-prefix block where `/courses-app` direct access is handled, add the same handling for `/apps-app`: host starts with `apps.` → `NextResponse.next()`; main host → redirect stripped path to `https://apps.devince.dev`.
  3. Apps has NO auth pages, so there is NO `APP_PAGE_PREFIXES` analog — skip that part.
  4. In the host-isolation section (where `courses.` rewrites to `/courses-app${pathname}`), add: host starts with `apps.` → rewrite to `/apps-app${pathname}`.

- [ ] **Step 2: Verify by build + curl smoke** (dev server may already run; if starting one, use `run_in_background`, never kill it with `pkill` at the end of a command):

```bash
curl -s -o /dev/null -w '%{http_code}' -H 'Host: apps.devince.dev' http://localhost:3000/   # expect 200 (apps storefront — after Task 11; before it: 404 is OK, just confirm NO main-site redirect/locale rewrite)
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/apps-app                        # expect 307/308 redirect to https://apps.devince.dev
```

- [ ] **Step 3: Commit** — `git commit -am "feat(apps): middleware host-rewrite apps.* -> /apps-app"`

### Task 10: `apps-app` layout + theme

**Files:** Create `src/app/apps-app/layout.tsx`, `src/app/apps-app/app-theme.css`, `src/app/apps-app/_components/{Nav,Footer,ThemeToggle}.tsx` (adapt from `src/app/courses-app/`).

- [ ] **Step 1: Read `src/app/courses-app/layout.tsx` and `_components/`** (Nav/Footer/ThemeToggle and the no-FOUC inline theme init).

- [ ] **Step 2: Copy `course-theme.css` → `app-theme.css`.** Keep tokens and component classes as-is (same design per spec). Only change: comment header noting it's the apps variant. (If class names embed `course-`, keep them — shared visual language, no renaming churn.)

- [ ] **Step 3: Write `layout.tsx`** as a 1:1 adaptation of the courses layout: own `<html className="dark" lang="pl">`, imports `./app-theme.css`, inline no-FOUC theme-init script (localStorage key `apps:theme`), Nav brand „Devince · apps" (link `/` storefront), Footer. Metadata: `title: { default: 'Devince · apps', template: '%s · Devince apps' }`.

- [ ] **Step 4: Verify** — `pnpm build` compiles (sitemap ENOENT postbuild is pre-existing, exit 0, ignore). Commit: `git commit -am "feat(apps): apps-app root layout + theme (Sylabus-derived)"`

### Task 11: Storefront page

**Files:** Create `src/app/apps-app/page.tsx` (+ reuse/adapt the Pagination component from `courses-app/_components` — import it directly from there if it's presentation-only; otherwise copy).

- [ ] **Step 1: Read `src/app/courses-app/page.tsx`** (the storefront listing pattern: `payload.find`, `?page=`, empty state, cards, pagination).

- [ ] **Step 2: Implement** the same pattern for products:

```tsx
import { getPayload } from 'payload'
import configPromise from '@payload-config'
// + card/pagination imports adapted from courses-app

export const dynamic = 'force-dynamic'

export default async function AppsStorefront({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'products',
    where: { _status: { equals: 'published' } },
    limit: 12,
    page,
    depth: 1, // coverImage
    overrideAccess: false,
    sort: '-createdAt',
  })
  // render: header (eyebrow "sklep", section-title), grid of product cards
  // (cover, title, short description, price in mono — format: (priceCents/100).toFixed(2).replace('.', ',') + ' zł' for pln),
  // each card links to `/${slug}`; empty state „Wkrótce"; pagination identical to courses storefront.
}
```
Price display helper: put `formatPrice(priceCents: number, currency: string): string` in `src/utilities/formatPrice.ts` with a small test (pln → `49,00 zł`, eur → `12,00 €`, usd → `$5.00` — keep it simple: `Intl.NumberFormat('pl-PL', { style: 'currency', currency })`).

- [ ] **Step 3: Verify** — with dev server: `curl -s -H 'Host: apps.devince.dev' http://localhost:3000/ | grep -i sklep` returns markup (empty state until fixture exists — that's fine, expect 200).

- [ ] **Step 4: Commit** — `git commit -am "feat(apps): storefront page (published products + pagination)"`

### Task 12: Product page + BuyButton + success page

**Files:** Create `src/app/apps-app/[slug]/page.tsx`, `src/app/apps-app/_components/BuyButton.tsx`, `src/app/apps-app/success/page.tsx`.

- [ ] **Step 1: Product page** — server component, `force-dynamic`: find published product by slug (`overrideAccess: false`), `notFound()` if missing. Render: hero (title, cover, description via the project's RichText renderer — find how courses/`(frontend)` render `richText` and reuse that component), price (formatPrice), `<BuyButton slug={product.slug} disabled={!files.length} />`, SEO via `generateMeta` (copy usage pattern from `courses-app/[slug]/page.tsx`).

- [ ] **Step 2: BuyButton** (client component):

```tsx
'use client'
import { useState } from 'react'

export function BuyButton({ slug, disabled }: { slug: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const buy = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/apps/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'checkout failed')
      window.location.assign(data.url)
    } catch {
      setError('Nie udało się rozpocząć płatności. Spróbuj ponownie.')
      setBusy(false)
    }
  }
  return (
    <div>
      <button className="btn btn-primary" onClick={buy} disabled={disabled || busy}>
        {busy ? 'Przekierowuję…' : 'Kup teraz'}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  )
}
```
(Match real button classes to what `app-theme.css` provides — check courses CTA classes.)

- [ ] **Step 3: `/success` page** — static, themed: „Dziękujemy za zakup!" + „Wysłaliśmy link do pobrania na Twój adres e-mail. Sprawdź też folder spam." + link back to `/`.

- [ ] **Step 4: Verify** — curl product page of a draftless DB → 404 themed; build passes. Commit: `git commit -am "feat(apps): product page + BuyButton + success"`

### Task 13: Download API route + shared grant resolution

**Files:** Create `src/utilities/resolveGrant.ts`, `src/app/(frontend)/api/apps/download/[token]/route.ts`.

- [ ] **Step 1: `resolveGrant.ts`** — shared by the API route and the `/download/[token]` page:

```ts
import type { Payload } from 'payload'
import { evaluateGrant, verifyDownloadToken } from './downloadToken'

export type ResolvedGrant =
  | { status: 'invalid' }
  | { status: 'expired' | 'limit'; grant: GrantDoc }
  | { status: 'ok'; grant: GrantDoc; product: ProductDoc }
// GrantDoc/ProductDoc: use the generated types from payload-types
// (import type { DownloadGrant, Product } from '@/payload-types')

export async function resolveGrant(payload: Payload, token: string): Promise<ResolvedGrant> {
  const secret = process.env.DOWNLOAD_TOKEN_SECRET
  if (!secret || !verifyDownloadToken({ token, secret })) return { status: 'invalid' }
  const found = await payload.find({
    collection: 'download-grants',
    where: { token: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const grant = found.docs[0]
  if (!grant) return { status: 'invalid' }
  const check = evaluateGrant(grant, new Date())
  if (!check.ok) return { status: check.reason, grant }
  const productId = typeof grant.product === 'object' ? grant.product.id : grant.product
  let product
  try {
    product = await payload.findByID({ collection: 'products', id: productId, depth: 0, overrideAccess: true })
  } catch {
    return { status: 'invalid' }
  }
  return { status: 'ok', grant, product }
}
```

- [ ] **Step 2: API route** — `src/app/(frontend)/api/apps/download/[token]/route.ts`. Copy the streaming + path-traversal-guard skeleton from `src/app/(frontend)/api/course/download/[id]/route.ts`, with these differences: private dir is `private-media-apps` (route depth: `src/app/(frontend)/api/apps/download/[token]/route.ts` → `'../../../../../../../private-media-apps'` — COUNT THE SEGMENTS against the course route which has the same depth and verify); gate is `resolveGrant` (all non-ok → 403 JSON, no detail leak); `?file=<assetId>` must be one of the grant's product `downloadFiles` ids (when absent and the product has exactly one file, use it; otherwise 400); on success increment `uses` (`payload.update` with `uses: grant.uses + 1`, `overrideAccess: true`) BEFORE returning bytes; asset loaded from `app-assets` with `overrideAccess: true`; same `Content-Disposition`/`Cache-Control: private, no-store` headers.

- [ ] **Step 3: Verify** — `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/apps/download/garbage` → `403`. `pnpm test:int` green. Commit: `git commit -am "feat(apps): grant-gated download streaming route"`

### Task 14: `/download/[token]` page + themed 404

**Files:** Create `src/app/apps-app/download/[token]/page.tsx`, `src/app/apps-app/not-found.tsx`.

- [ ] **Step 1: Download page** — server component, `force-dynamic`: `resolveGrant(payload, token)`; render per status:
  - `invalid` → „Link jest nieprawidłowy." (+ kontakt),
  - `expired` → „Link wygasł. Odpisz na maila z zakupem, aby otrzymać nowy.",
  - `limit` → „Limit pobrań został wyczerpany." (+ kontakt),
  - `ok` → product title + list of its `downloadFiles` (load each `app-assets` doc with `overrideAccess: true` for filename/size) as buttons linking `/api/apps/download/${token}?file=${assetId}`, plus „pozostało X pobrań" (`maxUses - uses`).
  The page itself does NOT consume a use — only the API route increments.

- [ ] **Step 2: `not-found.tsx`** — themed 404 (mirror `courses-app` one if it exists; otherwise simple section with link to `/`).

- [ ] **Step 3: Verify** — curl page with garbage token via apps host → 200 with „nieprawidłowy" message. Commit: `git commit -am "feat(apps): download page + themed 404"`

### Task 15: Fixture seed script

**Files:** Create `scripts/seed-app-fixture.ts`.

- [ ] **Step 1: Write the script** (idempotent — find-by-slug first; pattern reference: `scripts/import-course.ts` for payload init in a script):

```ts
// pnpm tsx scripts/seed-app-fixture.ts — dev/smoke fixture: product + asset + valid grant.
// Requires DOWNLOAD_TOKEN_SECRET in env. Prints the grant token.
```
Logic: init payload (same bootstrap as `import-course.ts`); ensure an `app-assets` doc by uploading a generated file (write `/tmp/devince-fixture.txt` with known content via `fs`, then `payload.create({ collection: 'app-assets', filePath })`); ensure product `aplikacja-testowa` (published, priceCents 4900, currency pln, description richText one paragraph, `downloadFiles: [assetId]` — for richText shape copy the helper used in seeds/`import-course.ts`); ensure one grant: `createDownloadToken(secret)`, `expiresAt` +7d, `maxUses 5`, `uses 0`, `stripeSessionId 'cs_fixture'` (find-by-`stripeSessionId` for idempotency); print `FIXTURE TOKEN: <token>` and exit 0.

- [ ] **Step 2: Run it** — `pnpm tsx scripts/seed-app-fixture.ts` (against dev DB from `.env`; ensure `DOWNLOAD_TOKEN_SECRET` is in `.env`). Expected: exits 0, prints token; re-run → same product, no dupes.

- [ ] **Step 3: Commit** — `git add scripts/seed-app-fixture.ts && git commit -m "chore(apps): smoke fixture seed (product + asset + grant)"`

### Task 16: Full local verification

**Files:** none (verification only). Dev server: start with `run_in_background`; do NOT end any command with `pkill`.

- [ ] **Step 1: Unit/int suite** — `pnpm test:int` → ALL pass (old 30 + new token/lineitem/brevo/fulfillment/formatPrice tests).
- [ ] **Step 2: Build** — `pnpm build` → compiles (ignore pre-existing `next-sitemap` postbuild ENOENT, exit 0).
- [ ] **Step 3: Smoke** (dev server + fixture token from Task 15):

```bash
H='Host: apps.devince.dev'
curl -s -o /dev/null -w '%{http_code}\n' -H "$H" http://localhost:3000/                       # 200 storefront, lists "aplikacja-testowa"
curl -s -H "$H" http://localhost:3000/ | grep -c aplikacja-testowa                            # >=1
curl -s -o /dev/null -w '%{http_code}\n' -H "$H" http://localhost:3000/aplikacja-testowa      # 200 product page
curl -s -o /dev/null -w '%{http_code}\n' -H "$H" http://localhost:3000/success                # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/apps/download/garbage      # 403
curl -s -o /dev/null -w '%{http_code}\n' -H "$H" "http://localhost:3000/download/$TOKEN"      # 200 page with file list
curl -s -D- -o /tmp/dl.bin "http://localhost:3000/api/apps/download/$TOKEN" | head -5         # 200 + Content-Disposition: attachment
cmp /tmp/dl.bin /tmp/devince-fixture.txt && echo BYTES-OK                                      # BYTES-OK
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/pl                              # 200 main site untouched
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: courses.devince.dev' http://localhost:3000/ # 200 courses untouched
```
Also verify `uses` incremented (re-fetch `/download/$TOKEN` page shows one fewer remaining download).

- [ ] **Step 4: Fix anything red, re-run until green.** Commit any fixes.

### Task 17: Push + PR (NO deploy)

- [ ] **Step 1:** `git push -u origin feat/apps-subdomain`
- [ ] **Step 2:** `gh pr create --base feat/courses-subdomain --title "feat: apps.devince.dev — downloadable-files store (one-time Stripe, no accounts)"` — body must include: feature summary, the stacked-branch note (merge #15 first; this PR auto-retargets to main), env vars to set on prod (`DOWNLOAD_TOKEN_SECRET`, `NEXT_PUBLIC_APPS_URL`, optional `BREVO_DOWNLOAD_TEMPLATE_ID`), deploy runbook delta vs courses (same migrate-on-boot flow; new migration `apps_store_model` applies automatically; DNS `apps.devince.dev` must be added; Stripe webhook endpoint unchanged; `private-media-apps/` volume/persistence on the server like `private-media/`), and the local verification evidence (test counts + smoke results). End body with the standard Claude Code attribution.
- [ ] **Step 3:** Do NOT deploy, do NOT touch main/prod. Done.

---

## Self-review notes

- Spec §4 collections → Tasks 1–3; §4 migration → Task 4; §5 token → Task 5; §6 flow → Tasks 6–8, 13–14; §7 subdomain/pages → Tasks 9–12, 14; §10 testing/fixture → Tasks 5–8 (TDD), 15–16; §11 workstreams map A1=T1–4, A2=T5, A3=T9–10, A4=T6–8, A5=T13–14, A6=T11–12, A7=T15–17.
- Names used consistently: `signDownloadToken`/`createDownloadToken`/`verifyDownloadToken`/`evaluateGrant` (T5) used in T8/T13; `buildLineItem` (T6); `fulfillAppPurchase` (T8); `sendDownloadLinkEmail` (T7→T8); `resolveGrant` (T13→T14); collections `products`/`app-assets`/`download-grants` everywhere.
- Known deliberate references-not-code: SEO/versions blocks copied from Program (exact code lives there; copying it into the plan risks drift), theme css copy, storefront/product JSX details (pattern files named explicitly). Executors must read the named source files first.
