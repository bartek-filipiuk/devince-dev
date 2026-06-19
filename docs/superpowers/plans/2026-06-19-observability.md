# Observability v1 — implementation plan

> Spec: `docs/superpowers/specs/2026-06-19-observability-design.md`. One devince
> branch `feat/observability`. No DB changes/migrations. Everything env-gated → ships
> dark, lights up when the owner sets `NEXT_PUBLIC_UMAMI_*` + `DISCORD_WEBHOOK_URL`.

**Global constraints**
- Money-critical: the webhook + checkout routes already grant access / fulfill. The
  event pipe (`notifyEvent`) MUST be best-effort — wrapped in try/catch, never throws,
  never blocks or rolls back a grant. A failing Discord POST or log is a no-op.
- Env-gated: no Umami script and no Discord POST unless the env is set. Default state
  (unset) = today's behavior exactly.
- Never `git add -A`; stage only task files. Tests: `pnpm test:int`. Build: `pnpm build`.
- Privacy: Umami anonymous/cookieless; only the server sale/refund/email-failed pings
  carry the buyer email (private channel).

## File structure
- `src/utilities/notify.ts` (+ `.test.ts`) — server pipe: structured log + optional Discord POST.
- `src/utilities/track.ts` (+ `.test.ts`) — client Umami custom-event helper.
- `src/components/UmamiScript.tsx` — env-gated Umami `<script>` (server component).
- 3 layouts get `<UmamiScript />`: `src/app/(frontend)/layout.tsx` (or the main root layout), `src/app/courses-app/layout.tsx`, `src/app/apps-app/layout.tsx`.
- `src/app/courses-app/_components/CourseCheckoutButton.tsx` + apps `BuyButton.tsx` — fire funnel events.
- `src/app/(frontend)/api/courses/checkout/route.ts` + `api/apps/checkout/route.ts` — `notifyEvent('checkout_start', …)` after session create.
- `src/app/(frontend)/api/stripe/webhook/route.ts` — `notifyEvent('purchase'|'refund'|'email_failed', …)`.
- `src/legal/content.ts` — Polityka Prywatności PL+EN: Umami + order-notification paragraphs.

---

### Task 1 — `notifyEvent` server pipe (TDD)
`src/utilities/notify.ts`:
```ts
type EventKind = 'purchase' | 'refund' | 'email_failed' | 'checkout_start'
export async function notifyEvent(kind: EventKind, payload: Record<string, unknown>): Promise<void> {
  // 1) always: structured log
  try { console.log(JSON.stringify({ event: kind, ...payload })) } catch {}
  // 2) optional: Discord
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: formatDiscord(kind, payload) }) })
  } catch { /* best-effort: never throw */ }
}
```
`formatDiscord(kind, payload)` builds the localized lines from the spec (🎉 Sprzedaż / ↩️ Zwrot / ⚠️ Mail nie dostarczony / 🛒 Checkout, with amount + email when present).
**Tests:** always logs; no fetch when `DISCORD_WEBHOOK_URL` unset; fetch called with the url when set; **never throws even when fetch rejects** (stub fetch to throw → `await expect(notifyEvent(...)).resolves.toBeUndefined()`).

### Task 2 — `track` client helper (TDD)
`src/utilities/track.ts`:
```ts
export function track(event: string, data?: Record<string, unknown>): void {
  try { (window as any).umami?.track?.(event, data) } catch {}
}
```
**Tests** (jsdom): no-op (no throw) when `window.umami` is undefined; calls `umami.track(event, data)` when present.

### Task 3 — `UmamiScript` env-gated component
`src/components/UmamiScript.tsx` (server component):
```tsx
export function UmamiScript() {
  const src = process.env.NEXT_PUBLIC_UMAMI_SRC
  const id = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
  if (!src || !id) return null
  return <script defer src={src} data-website-id={id} />
}
```
Add `<UmamiScript />` inside `<head>` (or end of `<body>`) of the three root layouts. Build-time `NEXT_PUBLIC_*` so it inlines per deploy. Unset → renders nothing (verify with a build + grep that the script tag is absent without the env).

### Task 4 — Funnel events in the buy controls
In `CourseCheckoutButton.tsx` (courses): on checkbox change → `track('consent_checked', { slug })` when ticking; in `buy()`: at entry `track('buy_click', { surface:'courses', slug })`; when `!consented` → `track('consent_blocked', { slug })`; right before `window.location.assign(data.url)` → `track('checkout_start', { surface:'courses', slug })`. Mirror the same four events in the apps `BuyButton.tsx` (`surface:'apps'`). Keep all existing behavior; `track` is fire-and-forget.

### Task 5 — Server pipe wiring (best-effort)
- `api/courses/checkout/route.ts` + `api/apps/checkout/route.ts`: after the Stripe session is created (before returning the url), `await notifyEvent('checkout_start', { surface, slug, amount, currency }).catch(()=>{})` — but since `notifyEvent` already never throws, a plain `await notifyEvent(...)` is fine. Do NOT let it change the response on failure.
- `api/stripe/webhook/route.ts`:
  - In each fulfillment branch, AFTER the grant/purchase succeeds: `notifyEvent('purchase', { surface, item, amount, currency, email })`.
  - In the `charge.refunded` path: `notifyEvent('refund', { item, email })`.
  - In the existing swallowed-email `catch` blocks (download/set-password/magic-link): `notifyEvent('email_failed', { kind, email })` alongside the existing `console.error`.
  - CRITICAL: every `notifyEvent` call sits AFTER the grant is durable and is best-effort; it must not be able to throw out of the webhook (it doesn't — Task 1 guarantees it). Do not `throw` on notify failure.

### Task 6 — Polityka Prywatności (PL+EN)
In `src/legal/content.ts`, add to the privacy policy: (a) **Analityka** — we use self-hosted Umami (`stats.67projects.app`), cookieless, no third-party trackers, anonymous aggregate stats; (b) **Powiadomienia o zamówieniach** — operational order notifications (incl. the buyer email) are sent to the operator's internal channel (Discord) and logs to run the service. Keep PL+EN parity (the legal content has both locales).

### Task 7 — Verify
`pnpm test:int` (notify + track tests green + existing suite); `pnpm build`; grep the build/SSR output to confirm the Umami script is absent when the env is unset and the webhook still fulfills (existing webhook tests pass).

---

## Owner steps (parallel; code ships dark without them)
1. Umami panel → Add website for the devince hosts → copy the **website-id** + the script URL → set `NEXT_PUBLIC_UMAMI_SRC` + `NEXT_PUBLIC_UMAMI_WEBSITE_ID` in Coolify (build-time) → redeploy.
2. Discord channel → Integrations → Webhooks → New Webhook → copy URL → set `DISCORD_WEBHOOK_URL` in Coolify (runtime).

## Execution
Single implementer (opus — touches the money-critical webhook), then an opus review
focused on best-effort integrity (a failing notify can't break a grant) + privacy
(no PII in the client/Umami events; email only in server sale pings) + env-gating.
Then build + deploy. NDQS Umami/Discord = separate fast-follow.
