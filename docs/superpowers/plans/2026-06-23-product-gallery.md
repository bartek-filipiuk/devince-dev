# Product screenshot gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A captioned screenshot gallery with a lightbox on the apps product page, driven by a new editable `screenshots` field on Products.

**Architecture:** A non-localized `screenshots` array field on Products (image + caption) → a pure `resolveScreenshots` helper maps it to display items → a client `ProductGallery` component renders a grid + lightbox → the product page renders it in a new section after the tier/buy block. Styles live in the apps theme; the external products API gains a `screenshots` allowlist entry for programmatic wiring.

**Tech Stack:** Next.js 15 App Router (RSC + one client component), Payload CMS 3.67 (PostgreSQL), TypeScript, vitest, existing i18n + media upload API, Playwright host smoke. No new dependencies.

## Global Constraints

- **No new 3rd-party dependencies.** Lightbox is hand-rolled (useState + a fixed overlay).
- **`screenshots` is fully NON-localized** (image + caption shared PL/EN) — a single PATCH replaces the array, no id-carry.
- **Schema ONLY via migrations** (`push:false`). After model change: `pnpm generate:types` + `pnpm payload migrate:create <name>`, commit `.ts` AND `.json`. Dev DB: Postgres `localhost:5436` (`docker compose up -d`), `DATABASE_URI` in `.env`.
- **Products is versioned (drafts)** → the migration is additive (new `products_screenshots` + version-variant tables, CREATE-only, no NOT NULL backfill on existing rows). Validate on dev with POPULATED `products` + `_products_v_*`.
- **i18n parity:** new keys exist in BOTH `pl` and `en` of `src/i18n/translations.ts` (enforced by `translations.test.ts`).
- **Styles via the apps theme** (`src/app/apps-app/app-theme.css`) on existing CSS variables (`--line`, `--line-soft`, `--accent-line`, `--text`, `--text-mut`, `--r-card`, `--bg`, `--bg-grad-a`). The component emits semantic classes only.
- **Branch:** `feat/product-gallery` from `main`. Commit per task with explicit paths (NEVER `git add -A`); the stray `src/migrations/20260618_200715_program_price.json` is NEVER committed (add new migration files by exact name). NO deploy from the build tasks.
- **Bash:** kill the dev server with `fuser -k 3010/tcp` — NEVER `pkill`.

---

### Task 1: `resolveScreenshots` pure helper (TDD)

**Files:**
- Create: `src/app/apps-app/_lib/resolveScreenshots.ts`
- Test: `src/app/apps-app/_lib/resolveScreenshots.test.ts`

**Interfaces:**
- Produces: `interface GalleryItem { url: string; alt: string; caption: string | null }`; `interface ScreenshotRow { image?: unknown; caption?: string | null }`; `function resolveScreenshots(rows: ScreenshotRow[] | null | undefined, fallbackAlt: string, getUrl: (url: string | null | undefined) => string | null): GalleryItem[]` — maps populated rows, skips rows whose `image` isn't a populated object or yields no url, caption falls back to image alt then `fallbackAlt`.

- [ ] **Step 1: Write the failing test**

Create `src/app/apps-app/_lib/resolveScreenshots.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveScreenshots } from './resolveScreenshots'

const idUrl = (u: string | null | undefined) => u ?? null

describe('resolveScreenshots', () => {
  it('maps populated rows to gallery items', () => {
    const rows = [{ image: { url: '/m/a.png', alt: 'A' }, caption: 'Cap A' }]
    expect(resolveScreenshots(rows, 'fallback', idUrl)).toEqual([
      { url: '/m/a.png', alt: 'Cap A', caption: 'Cap A' },
    ])
  })

  it('falls back to image alt, then fallbackAlt, when caption is empty', () => {
    expect(resolveScreenshots([{ image: { url: '/x', alt: 'imgalt' } }], 'fb', idUrl)[0].alt).toBe('imgalt')
    expect(resolveScreenshots([{ image: { url: '/y' } }], 'fb', idUrl)[0].alt).toBe('fb')
  })

  it('skips an unpopulated image (number id) or one that yields no url', () => {
    expect(resolveScreenshots([{ image: 42, caption: 'x' }], 'fb', idUrl)).toEqual([])
    expect(resolveScreenshots([{ image: { url: '/y' } }], 'fb', () => null)).toEqual([])
  })

  it('returns [] for null/empty input', () => {
    expect(resolveScreenshots(null, 'fb', idUrl)).toEqual([])
    expect(resolveScreenshots([], 'fb', idUrl)).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/app/apps-app/_lib/resolveScreenshots.test.ts --config ./vitest.config.mts`
Expected: FAIL — `Failed to resolve import "./resolveScreenshots"`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/app/apps-app/_lib/resolveScreenshots.ts`:

```ts
export interface GalleryItem {
  url: string
  alt: string
  caption: string | null
}

export interface ScreenshotRow {
  image?: unknown
  caption?: string | null
}

/**
 * Map a product's `screenshots` rows to renderable gallery items. Pure: the
 * media-url resolver is injected so it can be unit-tested without Payload.
 * Rows whose `image` is unpopulated (a numeric id at shallow depth) or yields
 * no url are skipped; caption falls back to the image alt, then `fallbackAlt`.
 */
export function resolveScreenshots(
  rows: ScreenshotRow[] | null | undefined,
  fallbackAlt: string,
  getUrl: (url: string | null | undefined) => string | null,
): GalleryItem[] {
  const out: GalleryItem[] = []
  for (const row of rows ?? []) {
    const img = row?.image as { url?: string | null; alt?: string | null } | null | undefined
    if (!img || typeof img !== 'object') continue
    const url = getUrl(img.url)
    if (!url) continue
    const caption = typeof row.caption === 'string' && row.caption.length > 0 ? row.caption : null
    out.push({ url, alt: caption ?? img.alt ?? fallbackAlt, caption })
  }
  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/app/apps-app/_lib/resolveScreenshots.test.ts --config ./vitest.config.mts`
Expected: PASS — 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/apps-app/_lib/resolveScreenshots.ts src/app/apps-app/_lib/resolveScreenshots.test.ts
git commit -m "feat(apps): resolveScreenshots helper with TDD"
```

---

### Task 2: `screenshots` field on Products + migration

**Files:**
- Modify: `src/collections/Products/index.ts` (after `coverImage`, line 66)
- Create: `src/migrations/<generated>_product_screenshots.ts` + `.json`
- Regenerate: `src/payload-types.ts`

**Interfaces:**
- Produces: `Product['screenshots']` = `{ image: number | Media; caption?: string | null; id?: string | null }[] | null` in `@/payload-types`.

- [ ] **Step 1: Ensure dev DB is up and migrated to baseline**

Run: `docker compose up -d && pnpm payload migrate`
Expected: containers up; "Done" / "No migrations to run".

- [ ] **Step 2: Add the field**

In `src/collections/Products/index.ts`, immediately after the `coverImage` line (line 66: `{ name: 'coverImage', type: 'upload', relationTo: 'media' },`), add:

```ts
            {
              name: 'screenshots',
              type: 'array',
              labels: { singular: 'Screenshot', plural: 'Screenshots' },
              admin: { initCollapsed: true },
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media', required: true },
                { name: 'caption', type: 'text' },
              ],
            },
```

- [ ] **Step 3: Regenerate types**

Run: `pnpm generate:types`
Expected: completes; `src/payload-types.ts` `Product` interface now has a `screenshots` array.

- [ ] **Step 4: Generate the migration**

Run: `pnpm payload migrate:create product_screenshots`
Expected: a new `src/migrations/<timestamp>_product_screenshots.ts` + `.json` is created. Open the `.ts` and confirm `up()` is **CREATE-only** — it creates `products_screenshots` (and the version variant table referenced from `_products_v_*`) with FKs to `media`; NO `ALTER TABLE ... ADD COLUMN ... NOT NULL` on any pre-existing table.

- [ ] **Step 5: Apply and verify**

Run: `pnpm payload migrate && pnpm payload migrate:status`
Expected: `product_screenshots` listed as applied (`Yes`).

- [ ] **Step 6: Commit**

Stage ONLY these exact paths (never `git add src/migrations/` — a stray untracked json lives there):

```bash
git add src/collections/Products/index.ts src/payload-types.ts src/migrations/$(ls src/migrations | grep _product_screenshots.ts) src/migrations/$(ls src/migrations | grep _product_screenshots.json)
git commit -m "feat(products): add screenshots array field + migration"
```

---

### Task 3: i18n key `apps.product.gallery`

**Files:**
- Modify: `src/i18n/translations.ts` (pl + en blocks)
- Modify: `src/i18n/translations.test.ts` (required-key list)

**Interfaces:**
- Produces translation key `apps.product.gallery` usable via `t(locale, 'apps.product.gallery')`.

- [ ] **Step 1: Add a failing assertion**

In `src/i18n/translations.test.ts`, inside the `required` array (after `'apps.product.buy',`), add:

```ts
      'apps.product.gallery',
```

- [ ] **Step 2: Run the i18n test to verify it fails**

Run: `pnpm exec vitest run src/i18n/translations.test.ts --config ./vitest.config.mts`
Expected: FAIL — `missing key "apps.product.gallery"`.

- [ ] **Step 3: Add the key to the `pl` block**

In `src/i18n/translations.ts`, inside `pl: { ... }`, near the other `apps.product.*` keys, add:

```ts
    'apps.product.gallery': 'Zrzuty ekranu',
```

- [ ] **Step 4: Add the key to the `en` block**

In the `en: { ... }` block, near the other `apps.product.*` keys, add:

```ts
    'apps.product.gallery': 'Screenshots',
```

- [ ] **Step 5: Run the i18n test to verify it passes**

Run: `pnpm exec vitest run src/i18n/translations.test.ts --config ./vitest.config.mts`
Expected: PASS — all i18n tests green.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/translations.ts src/i18n/translations.test.ts
git commit -m "feat(apps): i18n key for product gallery heading"
```

---

### Task 4: `ProductGallery` component + styles

**Files:**
- Create: `src/app/apps-app/_components/ProductGallery.tsx`
- Modify: `src/app/apps-app/app-theme.css` (append `.product-gallery*` rules)

**Interfaces:**
- Consumes: `GalleryItem` shape (`{ url, alt, caption }`) from Task 1 (re-declared locally to avoid a server/client import coupling).
- Produces: `ProductGallery({ items, heading }: { items: { url: string; alt: string; caption: string | null }[]; heading: string })`.

- [ ] **Step 1: Create the component**

Create `src/app/apps-app/_components/ProductGallery.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'

export interface GalleryItem {
  url: string
  alt: string
  caption: string | null
}

export function ProductGallery({ items, heading }: { items: GalleryItem[]; heading: string }) {
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!items.length) return null

  return (
    <>
      <h2 className="product-gallery__h">{heading}</h2>
      <div className="pg-grid">
        {items.map((it, i) => (
          <figure key={i} className="pg-card">
            <button
              type="button"
              className="pg-shot"
              onClick={() => setActive(i)}
              aria-label={it.alt}
            >
              <img src={it.url} alt={it.alt} loading="lazy" />
            </button>
            {it.caption ? <figcaption className="pg-cap">{it.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
      {active !== null ? (
        <div className="pg-lightbox" role="dialog" aria-modal="true" onClick={() => setActive(null)}>
          <button
            type="button"
            className="pg-lightbox__x"
            aria-label="Close"
            onClick={() => setActive(null)}
          >
            ×
          </button>
          <img src={items[active].url} alt={items[active].alt} />
        </div>
      ) : null}
    </>
  )
}
```

- [ ] **Step 2: Add the styles**

Append to `src/app/apps-app/app-theme.css`:

```css
/* Product screenshot gallery */
.product-gallery { padding: 8px 0 8px; }
.product-gallery__h { font-size: 22px; font-weight: 700; margin: 0 0 18px; color: var(--text); }
.pg-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.pg-card { margin: 0; }
.pg-shot {
  display: block; width: 100%; padding: 0; cursor: zoom-in; background: var(--bg-grad-a);
  border: 1px solid var(--line); border-radius: var(--r-card); overflow: hidden;
  transition: border-color 0.15s ease;
}
.pg-shot:hover { border-color: var(--accent-line); }
.pg-shot img { display: block; width: 100%; height: auto; }
.pg-cap { margin-top: 8px; font-size: 13px; color: var(--text-mut); }
.pg-lightbox {
  position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center;
  padding: 32px; background: rgba(0, 0, 0, 0.92); cursor: zoom-out;
}
.pg-lightbox img { max-width: 100%; max-height: 100%; border-radius: var(--r-card); }
.pg-lightbox__x {
  position: absolute; top: 18px; right: 24px; background: transparent; border: 0; cursor: pointer;
  color: #fff; font-size: 30px; line-height: 1; opacity: 0.7;
}
.pg-lightbox__x:hover { opacity: 1; }
@media (max-width: 560px) { .pg-grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 3: Build to verify it compiles**

Run: `pnpm build`
Expected: build succeeds (the component is a valid client component); no type errors from the new file. (A pre-existing `postbuild` next-sitemap ENOENT is unrelated — the Next compile success is the criterion.)

- [ ] **Step 4: Commit**

```bash
git add src/app/apps-app/_components/ProductGallery.tsx src/app/apps-app/app-theme.css
git commit -m "feat(apps): ProductGallery component + gallery styles"
```

---

### Task 5: Page wiring — render the gallery section

**Files:**
- Modify: `src/app/apps-app/[slug]/page.tsx`

**Interfaces:**
- Consumes: `resolveScreenshots` (Task 1), `ProductGallery` (Task 4), `apps.product.gallery` (Task 3), existing `getMediaUrl`, `t`.

- [ ] **Step 1: Add imports + bump fetch depth**

In `src/app/apps-app/[slug]/page.tsx`, add these imports near the other component imports (after the `ProductTierSelector` import, line 15):

```ts
import { ProductGallery } from '../_components/ProductGallery'
import { resolveScreenshots } from '../_lib/resolveScreenshots'
```

In `getProduct`, change `depth: 1,` (line 29) to `depth: 2,` so the screenshots array's `image` relation is populated.

- [ ] **Step 2: Render the gallery section**

In `ProductPage`, between the tier `</section>` block (ends line 152) and the `{product.description ? (` description section (line 154), insert:

```tsx
      {(() => {
        const shots = resolveScreenshots(
          product.screenshots,
          product.title,
          (u) => (u ? getMediaUrl(u) : null),
        )
        return shots.length ? (
          <section className="shell product-gallery">
            <ProductGallery items={shots} heading={t(locale, 'apps.product.gallery')} />
          </section>
        ) : null
      })()}
```

- [ ] **Step 3: Build to verify**

Run: `pnpm build`
Expected: build succeeds; `/apps-app/[slug]` still compiles; no type errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/apps-app/[slug]/page.tsx"
git commit -m "feat(apps): render screenshot gallery on the product page"
```

---

### Task 6: External products PATCH — allow `screenshots`

**Files:**
- Modify: `src/app/(frontend)/api/external/products/[idOrSlug]/route.ts`

**Interfaces:**
- Produces: `PATCH /api/external/products/<idOrSlug>` accepts `{ screenshots: [{ image: <mediaId>, caption?: string }] }` (or `null`) and forwards it to the update.

- [ ] **Step 1: Add `screenshots` to the request body type**

In `src/app/(frontend)/api/external/products/[idOrSlug]/route.ts`, the inline request type lists `downloadFiles?: unknown`, `coverImage?: unknown`, `tiers?: unknown` etc. (around line 25). Add:

```ts
  screenshots?: unknown
```

- [ ] **Step 2: Add the allowlist branch**

Immediately after the `coverImage` block (which ends `data.coverImage = body.coverImage` then `}` at line 107) and BEFORE the `if (body.tiers !== undefined) {` line (108), add:

```ts
    if (body.screenshots !== undefined) {
      if (body.screenshots !== null && !Array.isArray(body.screenshots)) {
        return createErrorResponse('VALIDATION_ERROR', 'screenshots must be an array (or null)')
      }
      data.screenshots = body.screenshots
    }
```

- [ ] **Step 3: Build to verify**

Run: `pnpm build`
Expected: build succeeds; no type errors in the route.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(frontend)/api/external/products/[idOrSlug]/route.ts"
git commit -m "feat(external-api): allow screenshots on products PATCH"
```

---

### Task 7: Dev fixture seed + full local verification

**Files:**
- Create: `scripts/seed-screenshot-fixture.ts`

**Interfaces:**
- Consumes: the `screenshots` field (Task 2), the fixture product `aplikacja-testowa` (from `scripts/seed-app-fixture.ts`).

- [ ] **Step 1: Ensure the fixture product exists**

Run: `pnpm tsx scripts/seed-app-fixture.ts`
Expected: prints `FIXTURE PRODUCT: aplikacja-testowa` (idempotent).

- [ ] **Step 2: Create the screenshot seed script**

Create `scripts/seed-screenshot-fixture.ts`:

```ts
/**
 * Attach 2 demo screenshots to the fixture product `aplikacja-testowa` so the
 * gallery can be smoke-tested locally. Idempotent: re-uploads + overwrites the
 * product's screenshots each run. Uses disableRevalidate (revalidatePath can't
 * run from a standalone script).
 *
 * USAGE: pnpm tsx scripts/seed-screenshot-fixture.ts
 */
import 'dotenv/config'
import fs from 'fs'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

// One known-good 1x1 PNG, reused for both demo shots — a smoke fixture only needs
// the grid to render two cards, not distinct images.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

async function uploadMedia(payload: any, name: string, data: Buffer, alt: string): Promise<number> {
  const created = await payload.create({
    collection: 'media',
    data: { alt },
    file: { data, name, mimetype: 'image/png', size: data.byteLength },
    overrideAccess: true,
  })
  return created.id
}

async function main() {
  const payload = await getPayload({ config: configPromise })
  const found = await payload.find({
    collection: 'products',
    where: { slug: { equals: 'aplikacja-testowa' } },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })
  const product = found.docs[0]
  if (!product) throw new Error('fixture product aplikacja-testowa not found — run seed-app-fixture.ts first')

  const id1 = await uploadMedia(payload, 'shot-one.png', PNG_1x1, 'Demo screenshot one')
  const id2 = await uploadMedia(payload, 'shot-two.png', PNG_1x1, 'Demo screenshot two')

  await payload.update({
    collection: 'products',
    id: product.id,
    overrideAccess: true,
    context: { disableRevalidate: true },
    data: {
      screenshots: [
        { image: id1, caption: 'Storefront' },
        { image: id2, caption: 'Admin dashboard' },
      ],
    } as never,
  })
  console.log('Attached 2 screenshots to aplikacja-testowa.')
  process.exit(0)
}

main().catch((e) => {
  console.error('FATAL:', e?.message || e)
  process.exit(1)
})
```

- [ ] **Step 3: Run the screenshot seed**

Run: `pnpm tsx scripts/seed-screenshot-fixture.ts`
Expected: prints `Attached 2 screenshots to aplikacja-testowa.`

- [ ] **Step 4: Run the full integration suite**

Run: `pnpm test:int`
Expected: all green (incl. `resolveScreenshots` + i18n parity). Note the pass count.

- [ ] **Step 5: Build**

Run: `pnpm build`
Expected: Next compile succeeds (postbuild sitemap ENOENT is pre-existing/unrelated).

- [ ] **Step 6: Host smoke (Playwright)**

Start dev: `pnpm dev` (background, :3010); wait until it responds.

Smoke on the apps host (`--host-resolver-rules="MAP apps.devince.dev 127.0.0.1"`, or Host header):
- `http://apps.devince.dev:3010/aplikacja-testowa` → 200; the page contains the gallery heading (PL „Zrzuty ekranu") and at least one `.pg-shot`; clicking a `.pg-shot` opens `.pg-lightbox`.
- `http://apps.devince.dev:3010/en/aplikacja-testowa` → 200; heading reads "Screenshots".
- A product with NO screenshots (the boilerplate-style fixture before seeding, or any other published product) renders NO `.product-gallery` section and does not crash.

Take one screenshot of the product page with the gallery for the record.

- [ ] **Step 7: Stop the dev server**

Run: `fuser -k 3010/tcp`

- [ ] **Step 8: Commit**

```bash
git add scripts/seed-screenshot-fixture.ts
git commit -m "feat(apps): screenshot fixture seed + verified gallery smoke"
```

---

## Notes for the executor

- After all tasks: dispatch the final whole-branch review, then use superpowers:finishing-a-development-branch. **Do NOT deploy from the build** — deployment + uploading the real 8 curated screenshots happens after merge, driven by the controller.
- If `migrate:create` reports "No changes detected", the field wasn't added — recheck Task 2 Step 2.
