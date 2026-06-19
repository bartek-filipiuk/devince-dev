# Phase 3 — Ops Maturity Runbook (owner steps)

> **Date:** 2026-06-19. Phase 2 is deployed + verified live. Phase 3 = production ops
> maturity (backlog #23–#27). The parts that need no owner accounts/decisions are
> **already done autonomously** (see #23 below). Everything else needs your dashboards,
> DNS, or accounts and is laid out here as concrete click-steps.

Coolify: https://cool.qaci.pl · App UUIDs — devince `nwgk0s00440skc0kwsskw4w4` (deploys from `main`);
NDQS backend `qo0sg4wsgk0gwoogg40koso4`, frontend `hko8so0gog4okcs4o8k0wkk4` (deploy from `feat/sales-bridge-auth`).
Postgres — devince-db `yk8ckw80gwww4owo0088wswg`, ndqs-db `s4c88k0cwgw4ow84kosokswo`.

---

## #23 Backups

**DONE autonomously:** scheduled **daily local Postgres backups** created on both DBs (there were none before):
- `devince-db` → 03:00 daily, database `payload`, keep last **14**, local.
- `ndqs-db` → 03:30 daily, database `ndqs`, keep last **14**, local.

**You still need to do (off-site + verify):**
1. **Off-site destination.** Local backups die with the server. In Coolify → each DB → *Backups* → add an **S3 destination** (any S3-compatible bucket: Backblaze B2, Cloudflare R2, AWS S3) and tick **Save to S3** on both backup schedules. Set an S3 retention (e.g. 30).
2. **Test a restore — the only backup that counts is one you've restored.** Trigger a manual backup (Coolify → DB → Backups → *Backup now*), download it, and restore into a throwaway Postgres (`pg_restore`/`psql`) to confirm it's valid. Do this once now and after any major schema change.

---

## #22 / #24 Sentry (error tracking)

The backend code is wired: `init_sentry()` is a **no-op until `SENTRY_DSN` is set** (Phase 2 #22).
1. Create a Sentry project (sentry.io free tier is fine) → copy its **DSN**.
2. Coolify → `ndqs-backend` → Environment → add `SENTRY_DSN=<dsn>` (runtime, not build-time) → redeploy.
3. Verify: errors now surface in Sentry. (devince/Payload has no Sentry wiring yet — add later if wanted.)

---

## #24 Uptime monitoring

No uptime monitor exists. Add one (UptimeRobot / BetterStack / Hetzner — free tiers fine) for the **5 endpoints**, alerting to your email:
- `https://devince.dev/` · `https://courses.devince.dev/` · `https://apps.devince.dev/`
- `https://learn.devince.dev/` (frontend)
- `https://api.learn.devince.dev/api/health` — **use this path**: it now returns HTTP **503** when DB or Redis is down (Phase 2 #22), so the monitor catches dependency failures, not just "process up".

Also wire the email-failure signal: the new `email_failures` table (NDQS) records every swallowed Brevo failure — periodically check it, or add an alert query.

---

## #25 Email deliverability (SPF / DKIM / DMARC)

Brevo's IP-allowlist is off (works), but for volume + inbox placement, authenticate the sender domain so magic-links + access emails don't land in spam:
1. Brevo → Senders & Domains → authenticate `devince.dev` → Brevo gives DKIM + SPF records.
2. Add to DNS: **SPF** (`v=spf1 include:spf.brevo.com ~all`), the **DKIM** CNAME/TXT Brevo provides, and a **DMARC** record (`v=DMARC1; p=quarantine; rua=mailto:you@devince.dev`).
3. Verify in Brevo (green checks) + send a test to mail-tester.com (aim ≥ 9/10).

---

## #26 Stripe hardening

Currently a **full `sk_live`** is in the devince env. Reduce blast radius:
1. Stripe Dashboard → Developers → API keys → create a **Restricted key** with only: Checkout Sessions (write), PaymentIntents (read), Charges (read), Webhooks (read) — drop everything else.
2. Replace `STRIPE_SECRET_KEY` in the devince Coolify env with the restricted key → redeploy → re-run a checkout to confirm.
3. Document webhook-secret rotation: if you rotate the signing secret in Stripe, update `STRIPE_WEBHOOK_SECRET` in Coolify + redeploy in the same window.

---

## #27 Secrets rotation

Document + schedule (e.g. quarterly) rotation of: `NDQS_SERVICE_TOKEN` (devince + NDQS — rotate both together), the NDQS JWT secrets (`JWT_*`), `OPENROUTER_API_KEY`, `EXTERNAL_API_TOKEN`, Brevo key. None are known to have leaked. Keep a short note of "last rotated" per secret.

---

## Quick owner checklist (Phase 2 leftovers, minutes each)

- [ ] Optional: live test purchase of the 47 PLN course end-to-end (consent → email → set-password → course).
- [ ] Admin cleanup: delete junk lessons on program 16 (id 13/14), orphan draft **program 15**, orphan **app-asset id 3**.
- [ ] Set `SENTRY_DSN` (see #22) when you create the Sentry project.
