# Pro-Readiness Backlog — devince platform (apps + courses + NDQS)

> **Date:** 2026-06-18. Consolidated from two production-readiness audits (courses-app
> sell-flow + NDQS) plus session findings. Goal: take everything from "works / thin
> pilot" to **professional, safe to charge real money**.

**Legend:** 🔴 P0 = security / blocks selling · 🟠 P1 = pro quality · 🟢 P2 = nice-to-have

---

## 0. Immediate cleanups (admin UI, minutes — no code)

- Delete 2 junk lessons on Program 16 (native course): **id 13 "TMP I dup"**, **id 14 "TMP Z new"** (test stubs; external API has no lesson DELETE yet).
- Delete the **orphan draft Program 15** (empty stuck draft from the first course attempt).
- Delete the orphan **app-asset id 3** `live-test-asset.zip` (dummy from the apps $1 live test).
- (Already done: $1 apps test product removed; Stripe live; Brevo IP-allowlist disabled.)

---

## 1. 🔴 NDQS — security blockers BEFORE charging real money

> **Headline:** as deployed, **any logged-in user can get the full SHADOW course for free**
> (self-enroll), and there is **no payment/refund record** on the NDQS side. Do NOT sell
> SHADOW for real money until #1–#8 below are fixed. (Selling apps + native courses is a
> separate stack and is not affected by these.)

1. **Free full-course access (paywall bypass).** Quests/evaluation gate only on `QuestState`, never on `Enrollment`; `POST /api/courses/{id}/enroll` needs only *any* session and SHADOW is `is_published=true`. → Make `/enroll` service-token/admin-only (remove public self-enroll); add an `Enrollment` check to briefing/submit/hint/active-quest. `backend/app/courses/router.py:105`, `quests/router.py`, `evaluation/router.py`.
2. **SSRF in `url_check` evaluator** — fires `httpx` at a learner-controlled URL with redirects, no allowlist → reaches `redis`/`db`/cloud metadata `169.254.169.254`. → Block private/loopback/link-local IPs (resolve first), disable redirects, require `https`. `backend/app/evaluation/deterministic.py:34-67`.
3. **Rate limiter globally collapsed in prod** — uvicorn has no `--proxy-headers`, so behind Caddy every request is keyed to the Caddy IP → one shared bucket → trivial DoS + email-spam + auth-throttle bypass. → Run uvicorn `--proxy-headers --forwarded-allow-ips="*"`. `backend/Dockerfile.prod:86`, `rate_limit.py:33`.
4. **Swagger UI + OpenAPI public in prod** — full admin/service surface enumerable. → `docs_url=None, redoc_url=None, openapi_url=None` in prod; drop the Caddy `/docs` proxy block. `backend/app/main.py:40`, `Caddyfile`.
5. **API-key store is in-memory + the `api_keys` table was never migrated** — every backend restart/redeploy silently kills all learner agent keys (the product's core loop). → Write migration 005 for `api_keys`, switch the store to DB. `backend/app/auth/api_keys.py:13`, `auth/models.py:36`.
6. **Dev-token endpoints mint arbitrary admin JWTs** — only env-gated; a misspelled `ENVIRONMENT` = instant admin bypass. → Delete `/api/auth/dev/token/*` + `/dev/auto-token` from the prod build, not just env-gate. `backend/app/auth/router.py:31-54`.
7. **No `.dockerignore`** (dev Dockerfile `COPY . .` would include `.env`). → Add `.dockerignore` (`.env`, `.venv`, `.git`); confirm prod secrets come only from Coolify env; rotate any key that touched a shared shell.
8. **No payment / refund / revocation linkage** — NDQS has no payment record, no `revoked_at`, no Stripe-refund→access-removal. A refund/chargeback leaves full access forever; support can't answer "did they pay?". → Add an entitlement/payment record written by `enroll-by-email`, an admin `revoke-enrollment` endpoint, and a Stripe refund webhook on devince that calls it. `backend/app/admin/service.py`, `courses/models.py:40`.

---

## 2. 🔴 Courses-app (native Payload courses) — can't sell from the storefront

9. **The buy button never opens the Payment Link.** Syllabus + storefront CTAs always link to the first lesson (`SyllabusHero.tsx:45`, `CtaBand.tsx:20`, `CourseCard.tsx:31`); `stripePaymentLink` is **dead in the UI**. A non-enrolled visitor cannot buy — they bounce login → enrollment-check → back to syllabus. → Fetch the session on the (force-dynamic) syllabus + storefront pages (`payload.auth({headers})` — the learn page already does this at `learn/[lesson]/page.tsx:24-48`), derive `enrolled`, and branch: paid + not-enrolled + has `stripePaymentLink` → real "Kup" `<a>` to the link; enrolled/admin → "Kontynuuj". Add a `courses.*.buy` i18n key. Fix `CourseCard` HTML nesting (a buy `<a>` can't live inside the card `<Link>`).

---

## 3. 🟠 P1 — Professional quality

### Courses
10. **Price shown nowhere** — Program has no price field (only `stripePaymentLink`/`stripePriceId`); 47 PLN lives only in Stripe. → Add `priceCents`+`currency` to Program, show near the buy button, wire into the external API; keep in sync with the Payment Link. `Program/index.ts:192`.
11. **Post-purchase dead end** — `set-password` hard-redirects to `/account` (`set-password/page.tsx:55`) and the access email has no `next`. A fresh buyer never gets a clean "start your course." → Add `&next=/<slug>/learn/<firstLesson>` to the access email (`brevo.ts:135`) + read/`safeNext`-guard it in set-password; relabel the account CTA "Rozpocznij kurs."
12. **Consent gap (Art. 38 pkt 13) for courses** — apps enforce withdrawal-waiver consent server-side; courses buy via a static Payment Link with **no consent captured at all**. Same legal exposure (immediately-accessible digital content), unsolved. → Best: move courses to a server-created Checkout Session (`/api/courses/checkout`) like apps, reusing the consent gate + `withdrawalConsentAt`. Alt: Payment Link `consent_collection.terms_of_service: required` pointing at the Regulamin.
13. **External course-management API gaps** — no DELETE for programs or lessons; no `lessons/[idOrSlug]` (no lesson edit/delete at all); POST program can't set `stripePaymentLink`/`stripePriceId` (PATCH can). → Add `DELETE programs/[idOrSlug]`, a `lessons/[idOrSlug]` route (PATCH+DELETE), and the stripe/price fields to programs POST. (Already fixed this session: `resolveDocId` overrideAccess+draft.)

### NDQS
14. **`enroll-by-email` partial-failure hole** — user committed, then enrollment+quest-init in a separate commit; if quest-init throws after the enrollment commit, a retry skips it → enrolled user with zero quests, stuck. → One transaction, or idempotent state-init independent of enrollment existence. `admin/service.py:33-62`.
15. **Email-failure has no alert/metric** — Brevo failures are swallowed to a warning; a buyer who never gets their link = silent lost sale. → Emit a metric/alert or a `comms_log` failure row on send failure. `admin/service.py:69`, `magic_router.py:49`.
16. **Auth completeness** — magic-link is the only working login; the `/login` page still shows a "Sign in with GitHub" button that fails in prod (no creds); no "resend link" on the expired-link screen. → Hide GitHub in prod (or wire OAuth properly), add one-click resend. `frontend/src/app/login/page.tsx:125`.
17. **No client-side auth gate** — `(dashboard)`/`missions`/`admin` layouts only wrap a sidebar provider; unauthenticated users render the full shell, admin layout doesn't role-check. → Add redirect-to-`/login` guards + admin role check.
18. **localStorage JWT + 15-min sessions with no refresh** — session in `localStorage` (XSS-exfiltratable), and the refresh token is never used on the frontend → learners log out mid-quest at 15 min. → Wire refresh-token rotation now; medium-term move to httpOnly cookie. `frontend/src/lib/session.ts:12`, `jwt.py:10`.
19. **OpenRouter spend uncapped** — no per-user/per-course LLM budget ceiling; combined with the free-enroll (#1) + broken limiter (#3), abusable to burn budget. → Per-user daily LLM-call cap + OpenRouter monthly budget alert. `backend/app/llm/openrouter_client.py`.
20. **`magic/verify` unthrottled** — the one auth endpoint with no rate limit. → Add a modest IP limit. `magic_router.py:60`.
21. **Hardcoded `localhost:8002` in prod learner UX** — profile quickstart + Starter Pack `.env.example` tell prod learners to use localhost → their agent hits nothing. → Template `https://api.learn.devince.dev`. `frontend/.../profile/page.tsx:246`, `courses/router.py:321`.
22. **Shallow healthcheck + no error tracking** — `/api/health` returns static ok (doesn't ping DB/Redis); structlog + correlation IDs exist but no Sentry. → Deepen health (DB+Redis ping) + add `/ready`; add Sentry. `main.py:114`. Remove the always-failing `/api/health/error-test` (`main.py:119`).

---

## 4. 🟠 Shared infra / production-readiness (both platforms)

23. **Backups** — no documented Postgres backup for devince OR NDQS. → Enable Coolify scheduled backups on both Postgres resources; test a restore.
24. **Monitoring / alerting** — no uptime monitor, no error aggregation across devince + NDQS. → Add uptime checks (the 4 hosts) + Sentry/error tracking + the email-failure alert (#15).
25. **Email deliverability at scale** — Brevo IP-allowlist now off; for volume, set up a proper authenticated sender domain (SPF/DKIM/DMARC) so magic-links + access emails don't land in spam.
26. **Stripe hardening** — currently a full `sk_live`. → Move app/CLI usage to **restricted** live keys (least privilege); document webhook secret rotation; add refund handling (ties to NDQS #8).
27. **Secrets** — many live secrets in Coolify env (fine) but no rotation policy; the NDQS `NDQS_SERVICE_TOKEN`, JWT secrets, OpenRouter key. → Document + schedule rotation; ensure none were logged.

---

## 5. 🟢 P2 — Nice-to-have

- NDQS T7 "HTTPS required" is enforced only by the LLM, not the deterministic check (`seed_shadow_course.py:380`).
- `command_output` evaluation trusts client-pasted text (inherent; document as a grading caveat).
- Prompt-injection regex layer is cosmetic (LLM tag-isolation is the real defense) — fine, but the cost cap (#19) matters more.
- NDQS storefront: SHADOW is sold via a Payment Link only; could surface a public catalog later.
- Courses + apps: more products, EN content entry, richer media.
- Lawyer review of all legal copy (Regulamin/Polityka) — already flagged.

---

## Recommended sequencing

**Phase 1 — make selling SAFE + possible (do before promoting):**
- NDQS P0 security #1–#8 (especially the free-access bypass + SSRF + rate-limiter + API-key persistence) — **required before selling SHADOW for real**.
- Courses #9 (buy button) — **required to sell native courses from the storefront**.

**Phase 2 — make it feel pro:** courses #10–#13, NDQS #14–#22.

**Phase 3 — ops maturity:** shared infra #23–#27.

> Apps store (`idea-to-mvp`) is the most production-ready surface today and can keep
> selling as-is. Native courses need #9 (+ ideally #12 consent). NDQS needs the P0
> security pass before it takes real money.
