# NDQS Quest-Course Sales Bridge — Design (thin validation pilot)

**Date:** 2026-06-18
**Status:** Design — approved direction, pending spec review → writing-plans
**Goal:** Sell access to an NDQS quest-course (pilot = "Operation SHADOW") through the
existing devince.dev Stripe, with a passwordless (magic-link) login — taking the
smallest path that proves *someone will pay and complete the first quest*.

---

## 1. Goal & success criteria

**Goal:** A buyer pays via a Stripe Payment Link on devince.dev → is auto-enrolled in
the SHADOW course on a separately-hosted NDQS instance → receives a magic-link email →
logs in (no password, no OAuth) → starts SHADOW and completes the first quest
end-to-end (submit → Game-Master evaluation → next quest unlocks).

**Definition of done (the "first sale"):** one real purchase drives the whole chain
above on production, verified the same way the apps $1 live test was (real Stripe
event → backend state → email delivered → learner action succeeds).

**This is a THIN VALIDATION pilot** (owner decision): prove willingness-to-pay, accept
rough edges. It is explicitly NOT a finished product.

---

## 2. Context & what is reused (do not rebuild)

Two systems, fully analysed (see the two analysis passes earlier this session):

**devince.dev** (Payload CMS 3.67 + Next 15 + Postgres, this repo) — already sells
courses + downloadable apps for real money. Reused verbatim:
- Stripe `checkout.session.completed` webhook with raw-body signature verification +
  idempotency via the unique-indexed `stripe-events` collection
  (`src/app/(frontend)/api/stripe/webhook/route.ts`). It already branches on
  `metadata.programId` (courses) and `metadata.productId` (apps); we add a third,
  mutually-exclusive branch on `metadata.ndqsCourseId`.
- The "metadata-on-the-Stripe-object → fulfillment" pattern (same shape as courses'
  `programId` and apps' `productId`).
- Coolify deploy + env-via-API workflow.

**NDQS** (`/home/bartek/main-projects/courses-platform/`, FastAPI + Next 16 + Postgres +
Redis, separate repo) — a gamified quest platform with an LLM "Game Master" evaluation
engine. Real and reused:
- `enrollments(user_id, course_id, enrolled_at)` model + `initialize_quest_states()`
  (the FSM init run at enrollment) — `backend/app/courses/...`.
- `users(id, email UNIQUE NOT NULL, display_name, provider, provider_id, role)`.
- Existing JWT infra (`backend/app/auth/jwt.py`: `decode_token`, signing secret,
  Redis-backed blacklist) — magic-link tokens reuse this, no new crypto.
- The "Operation SHADOW" course (9 quests; first quests built + Q1→Q2 unlock verified;
  later "deploy" quests T6–T8 unbuilt).

**Confirmed gaps that this pilot must close (net-new, small):**
- No endpoint to enroll a user by email on someone else's behalf.
- No access-code / magic-link / passwordless login of any kind.
- NDQS has never been deployed to production.

---

## 3. Architecture — two systems, one seam

```
[devince.dev Payment Link]                       [NDQS @ learn.devince.dev]
   metadata.ndqsCourseId = <SHADOW uuid>
        |
   buyer pays
        v
[devince Stripe webhook] --(1) POST /api/admin/enroll-by-email-->  enroll service
   checkout.session.completed   X-Service-Token: <shared secret>      |  upsert user(email, provider="stripe")
   reads ndqsCourseId + email                                         |  create enrollment (if absent)
                                                                      |  initialize_quest_states()
                                                                      |  (2) mint magic token + send email (Brevo)
                                                                      v
                                                  buyer gets "Twój dostęp" email
                                                       |
                                                  clicks magic link
                                                       v
                                  GET /api/auth/magic/verify?token  -> issue JWT session -> SHADOW
                                                       ^
                                  return-login: /login page -> POST /api/auth/magic/request {email} -> fresh link
```

The **only** coupling devince→NDQS is one authenticated HTTP call. Auth, identity,
email, and access all live in NDQS (Approach 1 — chosen over a devince-signed-redeem
scheme to keep a single clean seam and give NDQS a real reusable login).

---

## 4. Components

### 4.1 NDQS — `enroll-by-email` admin endpoint (net-new)

`POST /api/admin/enroll-by-email`
- **Auth:** a dedicated **service token** — a FastAPI dependency comparing header
  `X-Service-Token` against env `NDQS_SERVICE_TOKEN` (constant-time compare). NOT the
  in-memory API-key store, NOT OAuth. 401 on mismatch/absent.
- **Body:** `{ "email": str, "course_id": uuid }`.
- **Logic (idempotent):**
  1. Upsert user by `email`: if none, create `provider="stripe"`, `provider_id=email`,
     `display_name` = email local-part, `role="student"`. (Email is the identity;
     `provider/provider_id` satisfy NOT NULL via this convention.)
  2. Create `enrollment(user_id, course_id)` if not already present.
  3. Call existing `initialize_quest_states(user, course)`.
  4. Trigger the welcome magic-link email (§4.2) to `email`.
- **Returns:** `{ user_id, course_id, status: "enrolled", created_user: bool }`.
- Re-delivery safe: a repeated call finds the user + enrollment and no-ops (still 200),
  re-sending the email at most once per call.

### 4.2 NDQS — magic-link passwordless auth (net-new, stateless)

Reuses the existing JWT secret + Redis blacklist; no new tables.

- `POST /api/auth/magic/request` — body `{ "email": str }`, rate-limited.
  If a user with that email exists, mint a **magic token** = signed JWT
  `{ sub: user_id, purpose: "magic", jti, exp: now+15min }` and email a link
  `https://learn.devince.dev/auth/magic?token=<jwt>` via Brevo. **Always returns 200**
  (never reveal whether the email exists).
- `GET /api/auth/magic/verify?token=` — verify signature + `purpose=="magic"` + not
  expired + `jti` not already in the Redis used-set. On success: add `jti` to the
  used-set (single-use), issue a normal access JWT (existing 15-min) + the session the
  frontend expects, and redirect into the app. On failure: 400 → frontend shows
  "link expired, request a new one".
- **Frontend (minimal):** a `/login` page (enter email → POST magic/request →
  "check your email") and an `/auth/magic` callback page (reads `token`, calls verify,
  stores the JWT the way the existing dev-token path does, redirects to the course /
  missions). This replaces the dev auto-token as the entry path; `ENVIRONMENT=production`
  already disables the dev auto-token endpoint.
- NDQS gets Brevo credentials (one env block) so it owns both welcome + return-login
  emails — the return-login page must live in NDQS, so email lives there too.

### 4.3 devince — Stripe Payment Link (pilot = Payment Link only)

- Create one Stripe **Payment Link** for SHADOW (dashboard or API) with
  `metadata.ndqsCourseId = <SHADOW course uuid>`. Price set by owner. Payment Links
  collect the buyer email (used as the NDQS identity). **No storefront entry on
  courses.devince.dev for the pilot** (owner decision) — just the Payment Link URL,
  shared directly.

### 4.4 devince — webhook branch (net-new, small)

In `src/app/(frontend)/api/stripe/webhook/route.ts`, inside the existing
`checkout.session.completed` handler, add a branch mutually exclusive with the
`programId` and `productId` branches:
- Read `ndqsCourseId = session.metadata?.ndqsCourseId` and the buyer email.
- If present (and no `programId`/`productId`): `POST` to `NDQS_ENROLL_URL` with
  `X-Service-Token: NDQS_SERVICE_TOKEN`, body `{ email, course_id: ndqsCourseId }`.
- **Best-effort, same policy as the existing course/app branches:** a failure (NDQS
  down, non-2xx) is logged and the webhook still records the `stripe-events` row and
  returns 200 — so Stripe does not retry-storm. The buyer can be re-enrolled manually
  (re-POST enroll-by-email) from the recorded event. NO new devince email here — NDQS
  sends the magic-link.
- New devince env: `NDQS_ENROLL_URL`, `NDQS_SERVICE_TOKEN`.

### 4.5 Deploy / infra (the largest chunk — first-ever NDQS prod deploy)

- NDQS on the same Coolify, subdomain `learn.devince.dev`. The repo ships
  `docker-compose.yml` (FastAPI backend + Next frontend + Postgres + Redis + Caddy);
  deploy as a Coolify compose/app set. Frontend on `learn.devince.dev`, backend API
  reachable (e.g. `learn.devince.dev/api` or `api.learn.devince.dev`).
- Run Alembic migrations on boot; seed the SHADOW course + quests (existing seed path)
  into the prod NDQS DB.
- Env: DB + Redis URLs, JWT secret, `OPENROUTER_API_KEY` (LLM Game-Master — a real
  per-evaluation cost), Brevo creds, `NDQS_SERVICE_TOKEN`, `ENVIRONMENT=production`.
  OAuth client creds optional (magic-link is the pilot login; OAuth can stay absent).

---

## 5. Data flow (happy path + idempotency)

1. Buyer opens the SHADOW Payment Link, pays. Stripe emits
   `checkout.session.completed` with `metadata.ndqsCourseId` + `customer_details.email`.
2. devince webhook verifies signature, checks `stripe-events` idempotency, enters the
   `ndqsCourseId` branch, calls NDQS `enroll-by-email` (service token).
3. NDQS upserts user + enrollment + quest states, sends the welcome magic-link email.
4. devince records the `stripe-events` row, returns 200.
5. Buyer clicks the magic link → `/auth/magic` → verify → JWT session → SHADOW.
6. Buyer plays the first quest (in-browser and/or via the agent + API key they generate
   from the logged-in UI) → submit → Game-Master evaluation → next quest unlocks.

**Idempotency / re-delivery:** devince's `stripe-events` unique index blocks
double-processing; NDQS `enroll-by-email` is upsert-based, so even a duplicate call is
safe. A duplicate would at most re-send the welcome email once.

---

## 6. Security

- **devince→NDQS** authenticated by a shared `NDQS_SERVICE_TOKEN` (constant-time header
  compare); only this enroll endpoint accepts it; rotate by changing both envs.
- **Magic tokens** are short-lived (15 min) signed JWTs with `purpose:"magic"`, made
  single-use via the existing Redis blacklist (`jti`). `magic/request` never leaks
  whether an email exists (always 200) and is rate-limited (reuse NDQS rate-limit).
- The buyer's identity is their email (from Stripe). No password to store/leak.

---

## 7. Error handling & recovery

- **NDQS down at purchase time:** webhook logs the failure, still records the event +
  returns 200 (no Stripe retry storm). Recovery: owner re-POSTs `enroll-by-email` for
  that email/course from the recorded event (a one-liner / small admin script).
- **Magic link expired:** `/login` lets the buyer request a fresh link anytime.
- **LLM (OpenRouter) failure during evaluation:** existing NDQS orchestrator behaviour
  (out of scope to change for the pilot) — note it as a watch item.

---

## 8. Accepted rough edges (thin pilot — explicitly out of scope)

- **API-key store is in-memory** in NDQS → a server restart invalidates learner API
  keys; the learner re-generates from the logged-in UI. Persisting keys is deferred to
  post-validation (flag in the plan; do not fix now).
- **Late SHADOW quests (T6–T8, "deploy")** are stubbed/hidden — the pilot validates the
  first quests, not full completion.
- **OAuth login** not wired (magic-link only).
- **Refund/cancellation does not auto-revoke** NDQS access — manual for the pilot.
- **No storefront listing** for SHADOW — Payment Link only.
- **No NDQS payments** (correct — devince owns money).

---

## 9. Testing & verification

- **NDQS unit:** `enroll-by-email` (new user / existing user / idempotent repeat /
  bad service token → 401); magic `request` (existing email → mint+send, unknown email
  → 200 no-send no-leak, rate-limited); magic `verify` (valid → JWT, expired → 400,
  replayed `jti` → 400).
- **devince unit:** webhook `ndqsCourseId` branch calls NDQS with the right
  payload+header (NDQS mocked); branch is skipped when `programId`/`productId` present;
  NDQS failure is swallowed and the event still recorded.
- **Live e2e (the DoD):** Stripe Payment Link purchase (test mode first, then a real
  small live charge like the apps $1 test) → webhook → NDQS enrolled (DB row) →
  magic-link email delivered (Brevo) → click → session → SHADOW visible → first quest
  submit → Game-Master evaluation → next quest unlocks.

---

## 10. Decomposition (for writing-plans)

This pilot is end-to-end but contains two workstreams; the implementation plan should
phase them, W1 before W2's live test:

- **W1 — NDQS prod-readiness (bigger):** deploy NDQS to `learn.devince.dev` on Coolify
  (compose, migrations, seed SHADOW), add `enroll-by-email` admin endpoint, add
  magic-link auth (request/verify + `/login` + `/auth/magic` frontend), wire Brevo.
- **W2 — devince bridge (small):** Stripe Payment Link with `metadata.ndqsCourseId`;
  webhook `ndqsCourseId` branch; `NDQS_ENROLL_URL` + `NDQS_SERVICE_TOKEN` env;
  live e2e test.

W2's enroll call cannot be tested live until W1 is deployed. W1's magic-link + enroll
endpoint can be unit-tested independently before deploy.

---

## 11. Owner decisions / inputs needed (not blocking the spec)

- SHADOW **price** + the Stripe Payment Link (owner creates, or devince creates via
  Stripe API; set `metadata.ndqsCourseId`).
- **OpenRouter** account/key + a rough per-learner LLM budget expectation.
- The two cross-repo repos live side by side; implementation will touch BOTH
  `/home/bartek/main-projects/courses-platform/` (W1) and this repo (W2).
