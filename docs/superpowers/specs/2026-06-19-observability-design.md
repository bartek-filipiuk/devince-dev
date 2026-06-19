# Observability v1 — design (Umami funnel + Discord/logs event pipe)

> **Date:** 2026-06-19. Approved via brainstorming. Goal: see how users behave on the
> store/course pages — where they drop off, whether they click "Kup" — and get a
> real-time pulse of sales. Self-hosted, privacy-light, no new database.

## Goal

Two complementary layers:
1. **Behavioral funnel** (aggregate, anonymous) → **Umami** (self-hosted at
   `stats.67projects.app`): pageviews + custom conversion events, so the funnel
   `view → buy_click → consent → checkout_start → purchase` and its drop-off are
   visible per host.
2. **Real-time sales pulse** (high-signal) → **Discord webhook + structured logs**:
   the money events (`purchase`, `refund`, `email_failed`, `checkout_start`) fired
   server-side from the Stripe webhook / checkout routes, so a sale/refund/failed
   delivery pings Discord immediately. Sale pings **include the buyer email** (owner's
   private channel; small scale; noted in the privacy policy).

No new DB tables/migrations. Events go to Umami (external), Discord (webhook),
and logs only.

## Architecture

### Layer 1 — Umami pageviews
- A small server component `UmamiScript` renders the Umami `<script>` from env
  (`NEXT_PUBLIC_UMAMI_SRC`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID`). Renders **nothing** when
  the env is unset → ships dark, lights up when the owner sets the vars.
- Added to all three isolated root layouts: `src/app/(frontend)/.../layout.tsx`
  (main), `src/app/courses-app/layout.tsx`, `src/app/apps-app/layout.tsx`.
- **One devince website-id** covers all three hosts; Umami's dashboard filters by
  hostname. (NDQS/learn is a separate app → its own website-id, fast-follow.)

### Layer 2 — Custom funnel events (client → Umami)
- A tiny helper `track(event, data?)` (`src/utilities/track.ts`): calls
  `window.umami?.track(event, data)` if present; no-op otherwise. Never throws.
- Fired from the buy controls:
  - `buy_click` — user clicked "Kup"/"Kup dostęp" (data: `{ surface, slug }`)
  - `consent_blocked` — clicked buy with the consent box unchecked (friction signal)
  - `consent_checked` — ticked the consent box
  - `checkout_start` — the POST to checkout succeeded and we're redirecting to Stripe
- Surfaces: `CourseCheckoutButton` (courses) + apps `BuyButton`.

### Layer 3 — Server event pipe (Discord + logs)
- A util `notifyEvent(kind, payload)` (`src/utilities/notify.ts`):
  - Always writes a structured `console.log`/`console.error` line
    (`{ event, ...payload }`).
  - If `DISCORD_WEBHOOK_URL` is set, POSTs a formatted message to it.
  - **Best-effort: wrapped in try/catch, never throws, never awaited in a way that
    blocks fulfillment.** This is called from the money-critical webhook — it must
    not be able to break a grant.
- Called from:
  - `api/stripe/webhook/route.ts` — on a confirmed `purchase` (apps/courses/NDQS
    branches), on `refund` (charge.refunded), and on `email_failed` (the existing
    swallowed-email catch blocks).
  - `api/courses/checkout` + `api/apps/checkout` — on `checkout_start` (server-side,
    after the Stripe session is created).
- Discord message examples:
  - `🎉 **Sprzedaż** · Kurs „Bezpieczne flow" · 47,00 zł · jan@example.com`
  - `↩️ **Zwrot** · idea-to-mvp · jan@example.com`
  - `⚠️ **Mail nie dostarczony** · set-password · jan@example.com (grant OK, odzyskaj ręcznie)`
  - `🛒 **Checkout** · Kurs „…" · 47,00 zł`

### Privacy / RODO
- Umami: cookieless + anonymous → no cookie-consent banner needed.
- Discord sale pings carry the buyer email (owner's private channel; a transfer to
  Discord/US — disclose it).
- **Update `src/legal/content.ts`** (Polityka Prywatności, PL+EN): name Umami
  (self-hosted analytics, no third-party cookies) + the order-notification processing
  (operational notifications incl. email, recipient: the operator).

## Config (owner-provided; code is env-gated)

| Env | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_UMAMI_SRC` | devince (build-time) | Umami script URL, e.g. `https://stats.67projects.app/script.js` |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | devince (build-time) | the devince website-id from Umami |
| `DISCORD_WEBHOOK_URL` | devince (runtime) | Discord channel webhook URL |

Unset → the feature is a no-op (no script, no Discord), so it deploys safely before
the owner fills them.

## Scope

- **v1 (this build):** devince surfaces — courses + apps + main. Umami pageviews +
  funnel events + Discord/logs pipe + legal update.
- **Fast-follow (separate, NDQS repo `courses-platform`):** Umami on `learn.devince.dev`
  + Discord pings from the NDQS backend (it already has `email_failures` + structlog).

## Testing

- `track`/`notifyEvent` are unit-testable (TDD): `track` no-ops without `window.umami`;
  `notifyEvent` always logs, POSTs only when the env is set, and never throws even when
  the Discord POST fails.
- The webhook wiring is verified to stay best-effort (a failing notify cannot break a
  grant) — the existing webhook tests + a new test that a throwing notify is swallowed.
- Build + a smoke that the Umami script renders only when env is set.

## Out of scope (v1)

Session replay / heatmaps (PostHog) — revisit if the funnel data shows we need to see
*why* people drop off, not just *where*. Scroll-depth / time-on-page custom events —
easy add later if wanted.
