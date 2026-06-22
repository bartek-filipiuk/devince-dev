# Public Roadmap page — design spec (R0a)

**Date:** 2026-06-21 · **Surfaces:** apps.devince.dev + courses.devince.dev · **Status:** approved, ready for plan.

## Goal

A curated, public, status-tagged product roadmap at `/roadmap` on both the apps and courses
subdomains, so visitors see the product is alive and what's coming. Editable from the Payload admin
(no deploy per change). PL/EN localized. Nice but not over-engineered.

## Non-goals (explicitly OUT)

- **No leaking internal planning.** This is a hand-curated public subset. The internal `docs/ROADMAP.md`
  (policies, effort tags, "0 invoices today") is a separate source and never feeds this page.
- **No VAT-invoices item** on the public list (owner decision 2026-06-21 — don't signal the gap).
- **No external API route** for roadmap in v1 (edit in admin; `/api/external/roadmap` is a trivial later add).
- **No per-surface filtering** — one general list shown identically on both `/roadmap` pages; `track` is only a visual chip.
- **No timeline SVG / scroll animations / screenshots** (screenshots are R0b, a separate feature).

## Data model — Payload global `Roadmap`

New global (pattern: `src/SiteSettings/config.ts`). Registered in `src/payload.config.ts` `globals: [...]`.

```
slug: 'roadmap'
access: { read: () => true }          // public
fields:
  - name: 'items'
    type: 'array'
    labels: { singular: 'Roadmap item', plural: 'Roadmap items' }
    admin: { initCollapsed: true }
    fields:
      - name: 'title'        type: 'text'      required: true   localized: true
      - name: 'description'  type: 'textarea'                   localized: true
      - name: 'status'       type: 'select'    required: true   defaultValue: 'planned'
                             options: planned | in_progress | done        (NON-localized)
      - name: 'track'        type: 'select'    required: true   defaultValue: 'general'
                             options: general | apps | courses            (NON-localized)
```

- `title`/`description` localized → page reads the global at the visitor's locale.
- `status`/`track` are enums (non-localized); their human labels come from i18n `t()`.
- **No explicit `order` field** (YAGNI): admin array order = display order *within* a status group.
- New global = empty table on creation → migration is additive, **no backfill risk** (unlike the products case).

## Pages

- `src/app/apps-app/roadmap/page.tsx` and `src/app/courses-app/roadmap/page.tsx`.
- Each: thin server component, `export const dynamic = 'force-dynamic'` (always fresh, no cache hooks).
  Fetch `payload.findGlobal({ slug: 'roadmap', locale })`, pass `items` + `locale` to a shared `RoadmapView`.
- `generateMetadata` → `t(locale, 'roadmap.meta')`.
- The two pages differ only in the surrounding layout/theme (their own `layout.tsx`); content is identical.

## Shared component — `RoadmapView`

- `src/components/Roadmap/RoadmapView.tsx` (server component). Props: `{ items, locale }`.
- Imports a co-located `roadmap.css` that styles semantic classes using **existing theme CSS variables**
  (e.g. `hsl(var(--primary))`, `var(--border)`, `var(--muted-foreground)`), so the SAME markup adapts to
  each surface's palette automatically (apps theme vs courses theme) — one source of truth, consistent
  structure, per-surface colours. Matches the project's "style via theme tokens" philosophy.
- Renders status groups in fixed order: **in_progress → planned → done**. Empty groups are omitted.
  Each group: a heading via `t(locale, 'roadmap.status.<status>')`. Each item: a card with a status dot/chip,
  a `track` chip (`t(locale, 'roadmap.track.<track>')`), title, and 1–2 line description.
- Empty roadmap (no items) → friendly empty state `t(locale, 'roadmap.empty')`.

### Pure helper (the one unit-tested piece)

`groupByStatus(items)` → returns `[{ status, items }]` in order `['in_progress','planned','done']`,
each preserving input array order, **omitting** statuses with zero items. Pure, no I/O → TDD this.

## Navigation

Add a **Roadmap** link to both surfaces' nav: `src/app/apps-app/_components/Nav.tsx` and
`src/app/courses-app/_components/Nav.tsx`, label `t(locale, 'nav.roadmap')`, href `getLocalizedPath('/roadmap', locale)`.

## Localization / i18n keys

Dict is a flat dot-keyed table in **`src/i18n/translations.ts`**, one block per locale (`pl`, `en`),
accessed via `t(locale, 'key')` from `@/i18n`. **`src/i18n/translations.test.ts` enforces key parity** —
every key must exist in both locales (and listed keys are checked) → add to BOTH blocks; extend the test's
required-key list if it gates these.

Add (shared page content): `roadmap.meta`, `roadmap.title`, `roadmap.lead`, `roadmap.empty`,
`roadmap.status.planned`, `roadmap.status.in_progress`, `roadmap.status.done`,
`roadmap.track.general`, `roadmap.track.apps`, `roadmap.track.courses`.
Add (nav, per-surface namespace mirroring `apps.nav.*` / `courses.nav.*`): `apps.nav.roadmap`, `courses.nav.roadmap`.

PL: status = „Planowane / W trakcie / Gotowe"; track = „Ogólne / Apps / Kursy"; nav = „Roadmap".
EN: „Planned / In progress / Done"; „General / Apps / Courses"; „Roadmap".

## Seed / initial content (curated, VAT excluded)

Seeded once (admin or seed script) — statuses editable later in admin. Each item gets PL+EN text.

- **Gotowe / Done:** Płatności BLIK i karta · Pobieranie po zakupie bez konta (apps) · Pełne wersje PL/EN ·
  Progi cenowe Starter/Pro/Agency (apps) · Czytnik lekcji + śledzenie postępu (courses).
- **Planowane / Planned:** „Zapytaj kurs" — AI-asystent (courses) · „Zapytaj produkt" — czat przedsprzedażowy (apps) ·
  Certyfikaty ukończenia (courses) · Maile przypominające o postępie (courses) · Order bumps przy zakupie (apps) ·
  „Kup raz, dostajesz aktualizacje" (apps) · Opinie zweryfikowanych kupujących (apps) ·
  Strony produktów: screeny + lista funkcji (apps).
- **W trakcie / In progress:** none at launch (the page renders only non-empty groups). Owner promotes items in admin.

## Testing

- **Unit (TDD):** `groupByStatus` — order, in-group order preserved, empty groups omitted, all-empty input.
- **Build + smoke:** `pnpm test:int`, `pnpm build`; `/roadmap` returns 200 on apps + courses, PL and EN;
  renders seeded items; empty global → graceful empty state (no crash).
- Host smoke via Playwright host-rewrite (`apps.devince.dev` / `courses.devince.dev`).

## Migration & rules

- After adding the global + i18n: `pnpm generate:types`, then `pnpm payload migrate:create roadmap_global`,
  commit the `.ts` + `.json` snapshot. Schema ONLY via migrations (`push:false`). Dev DB localhost:5436.
- Branch from `main`, PR, **no deploy**. Build via `superpowers:subagent-driven-development`.

## File map

| File | Action |
|------|--------|
| `src/Roadmap/config.ts` | Create — the global config |
| `src/payload.config.ts` | Modify — register `Roadmap` in `globals` |
| `src/components/Roadmap/RoadmapView.tsx` + `roadmap.css` | Create — shared view + styles |
| `src/components/Roadmap/groupByStatus.ts` + `.test.ts` | Create — pure helper + unit test |
| `src/app/apps-app/roadmap/page.tsx` | Create — apps page |
| `src/app/courses-app/roadmap/page.tsx` | Create — courses page |
| `src/app/apps-app/_components/Nav.tsx` · `src/app/courses-app/_components/Nav.tsx` | Modify — add Roadmap link |
| `src/i18n/translations.ts` (+ `translations.test.ts`) | Modify — add roadmap.* + apps/courses.nav.roadmap keys (pl+en), keep parity test green |
| `src/migrations/<ts>_roadmap_global.*` | Create — generated migration (additive) |
| seed | Add curated starter items (or one-time admin entry) |
