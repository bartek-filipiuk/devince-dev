# Product screenshot gallery — design spec (R0b)

**Date:** 2026-06-23 · **Surface:** apps.devince.dev product page · **Status:** approved, ready for plan.

## Goal

A screenshot gallery on the apps product page (`apps-app/[slug]`) so a downloadable product (esp. the
`course-platform-starter` boilerplate) can show what the buyer gets — captioned thumbnails with a
click-to-zoom lightbox. Editable in admin, reusable for any product.

## Non-goals (OUT)

- **Captions are NOT localized** (owner decision 2026-06-23) — `screenshots` is a fully non-localized field
  → single-PATCH wiring, no two-pass, no caption locales table. (Localized captions = a later add.)
- No per-image cropping/ordering UI beyond Payload's native array drag-order.
- No carousel/autoplay — a static grid + lightbox is the bar.
- No new 3rd-party dependencies (lightbox is hand-rolled, like `gallery.html`).

## Data model — `Products.screenshots`

New field in `src/collections/Products/index.ts`, placed right after `coverImage` (same tab):

```
- name: 'screenshots'
  type: 'array'
  labels: { singular: 'Screenshot', plural: 'Screenshots' }
  admin: { initCollapsed: true }
  fields:
    - name: 'image'   type: 'upload'  relationTo: 'media'  required: true
    - name: 'caption' type: 'text'                          (optional, NON-localized)
```

- The whole field is **non-localized** (image + caption shared across PL/EN).
- Products is **versioned (drafts)** → the migration creates the array table `products_screenshots`
  AND its version variant under `_products_v_*`. Additive (new tables, CREATE-only) — no backfill on
  existing rows. Validate on dev against POPULATED product tables.

## Server helper — `resolveScreenshots`

`src/app/apps-app/_lib/resolveScreenshots.ts` (pure, unit-tested):

`resolveScreenshots(product): { url: string; alt: string; caption: string | null }[]`
- Maps `product.screenshots` → display items: for each row, if `image` is a populated Media object,
  emit `{ url: getMediaUrl(image.url), alt: caption || image.alt || product.title, caption }`.
- Skips rows whose `image` is missing/unpopulated (depth too shallow) or has no url. Returns `[]` for none.
- Pure (takes already-fetched product + a `getUrl` fn injected for testability).

## Component — `ProductGallery`

`src/app/apps-app/_components/ProductGallery.tsx` — **client component** (`'use client'`, lightbox needs
state). Props: `{ items: { url, alt, caption }[]; heading: string }`.
- Renders a section heading + a responsive grid of cards (thumbnail + optional caption).
- Click a thumbnail → fixed lightbox overlay with the full image; close on overlay-click, the ✕, or Esc.
- Semantic classes only (`.product-gallery`, `.pg-grid`, `.pg-card`, `.pg-shot`, `.pg-cap`, `.pg-lightbox`)
  styled in `app-theme.css` on theme variables.

## Page wiring — `apps-app/[slug]/page.tsx`

- `getProduct` already fetches at `depth: 1`; bump to **`depth: 2`** so the screenshots array's `image`
  relation is populated (array adds a nesting level).
- After the tier/buy `<section className="tier-section">` and **before** the description section, add:
  ```
  const shots = resolveScreenshots(product)
  {shots.length ? (
    <section className="shell product-gallery">
      <ProductGallery items={shots} heading={t(locale, 'apps.product.gallery')} />
    </section>
  ) : null}
  ```

## Styling — `app-theme.css`

Add `.product-gallery*` rules on theme vars (`--line`, `--line-soft`, `--accent-line`, `--text`,
`--text-mut`, `--r-card`, `--bg`): grid `repeat(auto-fill, minmax(280px,1fr))`, cards with border + hover
lift, captions in `--text-mut`, lightbox overlay `rgba(0,0,0,.92)` with centered image. Mirrors `gallery.html`.

## i18n

Add to `src/i18n/translations.ts` (pl + en) and keep the parity test green:
`apps.product.gallery` → PL „Zrzuty ekranu" · EN „Screenshots".

## External API (for autonomous wiring)

- **products PATCH** (`src/app/(frontend)/api/external/products/[idOrSlug]/route.ts`): add `screenshots` to
  the forwarded-field allowlist — `if (body.screenshots !== undefined) { validate it's an array; data.screenshots = body.screenshots }`.
  (Non-localized → no id-carry needed; a single PATCH replaces the array.)
- **media upload**: existing `POST /api/external/media` (multipart `file`) returns the media id — used to
  upload each screenshot, then PATCH the product's `screenshots` with `[{ image: <mediaId>, caption }]`.

## Testing

- **Unit (TDD):** `resolveScreenshots` — populated rows mapped, unpopulated/missing-url rows skipped,
  caption fallback for alt, empty input → `[]`.
- **Build + smoke:** `pnpm test:int`, `pnpm build`; host smoke on `apps.devince.dev/<slug>`:
  a product WITH screenshots renders the gallery + lightbox opens; a product WITHOUT renders no gallery
  section (no crash). PL + EN heading.

## Migration & rules

- `pnpm generate:types` → `pnpm payload migrate:create product_screenshots` → commit `.ts` + `.json`.
  Schema only via migrations (`push:false`). Validate on dev with populated `products` + `_products_v_*`.
- Branch from `main`, PR, deploy (devince). The stray `20260618_200715_program_price.json` is NEVER committed.

## Content / wiring (after deploy)

Upload ~8 curated shots from the `course-platform-starter` set (generic Acme demo) via `/api/external/media`,
then PATCH `course-platform-starter` `screenshots` with captions (non-localized):
Course landing page · Lesson reader · Admin dashboard · Lesson editor (Lexical) · Agent-ready: AGENTS.md ·
Course catalog · Lesson reader on mobile · Product page.

## File map

| File | Action |
|------|--------|
| `src/collections/Products/index.ts` | Modify — add `screenshots` array field |
| `src/app/apps-app/_lib/resolveScreenshots.ts` + `.test.ts` | Create — pure helper + unit test |
| `src/app/apps-app/_components/ProductGallery.tsx` | Create — client gallery + lightbox |
| `src/app/apps-app/[slug]/page.tsx` | Modify — depth 2 + render gallery section |
| `src/app/apps-app/app-theme.css` | Modify — `.product-gallery*` styles |
| `src/i18n/translations.ts` (+ `translations.test.ts`) | Modify — `apps.product.gallery` (pl+en) |
| `src/app/(frontend)/api/external/products/[idOrSlug]/route.ts` | Modify — allowlist `screenshots` |
| `src/payload-types.ts` · `src/migrations/<ts>_product_screenshots.*` | Generated — types + additive migration |
