# devince platform — overview & sales flows

> Starting point for the whole platform: three product surfaces, one live Stripe.
> Companion docs: `docs/EXTERNAL-CONTENT-API.md` (drive content via API),
> `docs/PHASE3-OPS-RUNBOOK.md` (ops hardening), `docs/HANDOFF.md` (latest state).

## Big picture

Three products, **one live Stripe** (`sk_live`) + **one webhook**
(`https://devince.dev/api/stripe/webhook`) that branches by metadata, **two repos**:

- **devince** (this repo) → serves **devince.dev + courses.devince.dev + apps.devince.dev**
  from one container (routed by `src/middleware.ts`). Deploys from `main` (Coolify
  app `nwgk0s00440skc0kwsskw4w4`).
- **NDQS** (repo `courses-platform`) → **learn.devince.dev** (Next frontend) +
  **api.learn.devince.dev** (FastAPI backend). Coolify project `ndqs`.

The webhook (`checkout.session.completed`) routes on metadata:
`metadata.productId` → apps · `metadata.programId` → courses · `metadata.ndqsCourseId`
→ NDQS. `charge.refunded` reverses access (revokes the NDQS enrollment).

---

## 1) apps.devince.dev — downloadable products (no accounts)

Sells files (e.g. `idea-to-mvp`, $49). **No login.**

```
Product page → consent checkbox (Art. 38) → POST /api/apps/checkout (Stripe Checkout)
 → pay → webhook → DownloadGrant (HMAC token, 7 days / 5 downloads)
 → Brevo email with link → /download/<token> streams the file from private storage
```
Buyer gets an **expiring download link by email**. No public file URLs.
**Status: ✅ production-ready — passed a real live sale.**

## 2) courses.devince.dev — native Payload courses (account + password)

Sells video/text courses (e.g. **"Bezpieczne flow", 47 PLN**, program 16 — with a
landing + per-lesson teasers).

```
Course page (landing + price + consent checkbox) → POST /api/courses/checkout
 → pay → webhook: add program to user.purchases + send "set password" email
 → set-password (lands on the course) → log in → watch lessons (paywalled)
```
Buyer gets an **account + a set-password email** (NOT a magic link). Lessons are
paywalled: having an account isn't enough — the program must be in `user.purchases`
(or be admin). **Status: ✅ ready** (consent checkout, set-password reachable, landing live).

## 3) learn.devince.dev — NDQS quest courses (magic-link)

Sells interactive quest courses with an **LLM Game Master** (evaluation engine, hard
gates). Pilot: the **SHADOW** course. Separate FastAPI+Next stack.

```
Stripe Payment Link (metadata.ndqsCourseId) → pay → devince webhook
 → POST NDQS /api/admin/enroll-by-email (service-token) → enrollment + quests
 → magic-link email (Brevo) → passwordless login → quest
```
Buyer gets a **magic-link** (passwordless). **Status: 🟡 infra + security ready**
(paywall airtight, Phase 1+2 done); sold via a Stripe **Payment Link** (no public
storefront yet — share the link directly).

---

## Shared infrastructure

- **Stripe LIVE** — one `sk_live`; live webhook branches apps/courses/NDQS by metadata;
  `charge.refunded` reverses access.
- **Brevo** — all transactional email (download / set-password / magic-link); sender
  `bartek@devince.dev`.
- **Legal** — Regulamin + Polityka Prywatności (PL/EN); **Art. 38 pkt 13 consent**
  enforced server-side on apps + courses (digital-content withdrawal waiver) + a
  durable-medium email confirmation.
- **Refunds** — Stripe refund → webhook revokes the grant/enrollment.
- **Backups** — daily Postgres backups on both DBs (retention 14).
- **Content via API** — see `docs/EXTERNAL-CONTENT-API.md` (prices, landing, lessons,
  products). Lessons/landing/price are **API-only** (the MCP doesn't cover them).

## Readiness to charge

| Surface | Status | Remaining |
|---|---|---|
| apps | ✅ selling | none (live sale proven) |
| courses | ✅ selling | (optional) one live test purchase |
| learn/NDQS | 🟡 almost | create the SHADOW Payment Link + click the flow once |

**Before promoting at volume** (all owner-side, in `docs/PHASE3-OPS-RUNBOOK.md`):
restricted Stripe key, SPF/DKIM/DMARC, Sentry DSN, uptime monitor, off-site backups.

## Test the real flow ($1 live)

$1 live test surfaces (keep or delete after testing):
- apps: `https://apps.devince.dev/test-1--apps`
- courses: `https://courses.devince.dev/kurs-testowy-1`
- NDQS: a $1 Stripe Payment Link with the SHADOW metadata (`metadata.ndqsCourseId`).
