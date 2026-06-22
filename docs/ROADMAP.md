# Roadmap — what we're committing to build (devince apps + courses)

> **This is the COMMITTED, sequenced plan.** The full research menu lives in
> [`GROWTH-BACKLOG.md`](./GROWTH-BACKLOG.md) — this file is the subset we've decided to do, in order.
>
> **Policy: build in devince FIRST, backport to the sellable boilerplate LATER (selectively).**
> Features ship to our own `apps.devince.dev` / `courses.devince.dev` first. We do **not** add
> them to the `course-platform-starter` package until they're proven + we decide they belong in
> the product. (So the package stays stable while our live sites lead.)
>
> Status: 🔜 now · ⏭️ next · 🕐 later. Effort: [L]/[M]/[H].

---

## 🔜 NOW — committed, starting here

### R0. Storefront transparency — public roadmap + product detail pages  ·  [S–M]  ·  apps + courses
**Why now:** R1 is **blocked on accountant input**, so these are the best *unblocked* near-term work —
low effort, pure marketing/conversion upside, no schema/payment risk. Two pieces:

**R0a. Public roadmap page** (`apps.devince.dev/roadmap` + `courses.devince.dev/roadmap`) — a *nice*,
status-tagged roadmap (Planned / In progress / Shipped) so visitors see the product is alive and what's
coming. **Important:** it's a **curated PUBLIC subset** — NOT a verbatim dump of this file (which holds
internal policy, effort tags, "we have 0 invoices today" gaps). Recommended source: a small editable
**Payload global `Roadmap`** (items: title, description, status, track apps/courses/both) so it's updated
from the admin / external API without a deploy. One page component per surface + theme styling.

**R0b. Product detail subpages — screenshots + main-feature list** (apps first; courses = "what you'll
learn"). A dedicated section/subpage per product with a **screenshot gallery** + a **structured feature
list**. Needs a small content-model add on `Products` (e.g. `screenshots` media array + `features`
array) — then a gallery + feature-grid component, styled via the app theme. Apps gains the most ("does it
do X" answered visually); courses can reuse for curriculum/highlights.

**Effort honesty:** "not much work" is right *if* we lean on a simple Payload global + media array and the
existing theme — call it a focused day or so each, done properly (TDD for any logic, build+smoke for pages).
**Boilerplate:** devince-only for now (both are broadly useful backport candidates later).

---

### R1. VAT invoices — self-service PDF download after purchase  ·  [L–M]  ·  apps + courses  ·  ⛔ BLOCKED (accountant)
> **Status: blocked on owner consulting księgowa** (see `docs/R1-VAT-faktury-research.md`). Key finding:
> seller is czynny VAT → Stripe `invoice_creation` alone is NOT a compliant faktura VAT, and KSeF B2B is
> mandatory from 1.04.2026. Lightest compliant path = Stripe (payment + NIP + Stripe Tax) → webhook →
> **Fakturownia** issues the faktura + KSeF for B2B → email PDF. Resume build after accountant answers.
**Why it's first:** EU/PL **B2B buyers need a faktura VAT** to expense the purchase. Today they get
only the download link — no invoice. This is a concrete, high-value gap with a clear "buyer downloads
their invoice" outcome.
**What:** after payment, the buyer can download a compliant PDF invoice (enters company name / address /
NIP-VAT-ID); receipt emailed alongside the download link. Locale-correct VAT lines (PL/EN).
**How (our stack):** we already email the link + have the order (`download-grants` / Stripe session) →
add (a) **Stripe Tax** for VAT compute + collect + VAT-ID validation, (b) a server-rendered invoice PDF,
(c) a signed self-service "download invoice" link (keyed off the order + email, account-less).
**Decision baked in:** **Stripe Tax (DIY), NOT Merchant-of-Record** — self-hosted = we're the seller.
**Boilerplate:** devince-only for now. Backport candidate later (it's broadly useful) — but not in the package yet.

---

## Track: APPS  (apps.devince.dev — downloadable products)

| | Item | Why | Effort | Notes |
|---|------|-----|--------|-------|
| ⏭️ | **A. "Ask the product" RAG** (pre-sale chat on the product page, grounded in the product's docs: README/AGENTS/FEATURES/description) | answers buyer objections → conversion + cuts support; huge for the boilerplate ("does it do X / how do I swap Y") | [L–M] | same engine as courses (pgvector + Claude), content = product docs. Pre-sale first; post-purchase support optional. |
| ⏭️ | **B. Order bumps** at checkout (cross-sell a related product) | +15–30% AOV, fastest revenue lever | [L] | extra Stripe line item + `bumpProductId`. |
| ⏭️ | **C. Version-update re-download** ("buy once, get updates" — email past buyers a fresh signed link to the new version) | top trust/retention signal for software; **perfect for the boilerplate** (v1.0.x cadence) | [M] | re-issue an HMAC link to the new file — our existing primitive. |
| 🕐 | **D. Verified-buyer reviews / testimonials** on the product page | 98% read reviews pre-buy; testimonial by CTA ~+34% convert | [L–M] | collected via post-purchase email, "verified" keyed off the order. |
| 🕐 | **E. Fast revenue pack** — coupons, flash-sale countdown, live social proof ("X sold"), analytics + pixels | low-effort conversion/AOV, leans on Stripe + our own order data | [L] | |
| 🕐 | **F. License keys** (if we sell more software/apps) · **PPP geo-pricing** · **affiliate program** | anti-piracy / TAM / zero-CAC growth | [M] | later, as the catalog grows. |

---

## Track: COURSES  (courses.devince.dev — gated course player)

| | Item | Why | Effort | Notes |
|---|------|-----|--------|-------|
| ⏭️ | **A. "Ask the course" RAG tutor** (chat grounded only in that course's lessons, with citations) | 24/7 instructor at ~$0 marginal; biggest AI differentiator; answers "I'm stuck" → completion | [L–M] | **shares the RAG engine + pgvector with Apps "ask the product"** — build the engine once. |
| ⏭️ | **B. Progress-nudge emails** (idle / milestone / not-started) | the most-cited completion fix; reuses `lesson_progress` (already shipped) | [L–M] | cron + Brevo PL/EN; Claude personalizes copy. |
| ⏭️ | **C. Verifiable completion certificate** (PDF + public verify URL, optional quiz-gate) | trust + completion + free LinkedIn marketing (our name as issuer) | [L–M] | |
| 🕐 | **D. Cohort / Challenge layer** (shared start/finish, deadlines, waitlist + urgency emails) | the big one: completion 60–90% vs 3–15%, 3–5× price; **fits one-time payments** (each cohort = a one-time SKU) | [M] | pairs with B (nudges) + AI grading. |
| 🕐 | **E. AI quizzes / flashcards / summaries** generated per lesson at publish time | passive → active recall; near-free with Claude; feeds certs/gates | [L] | one Claude pass in the content pipeline. |
| 🕐 | **F. AI PL↔EN translation** of lessons (text first) · **drip/scheduled unlock** · **gamification** (streaks/XP/badges) | doubles addressable market · paces completion · engagement | [L–M] | |

---

## Shared infrastructure (build once, both tracks use it)

- **pgvector in our Postgres** → powers "Ask the product" (Apps) + "Ask the course" (Courses). Build the RAG engine once, point it at different content sources.
- **Stripe Tax** → VAT compute/collect/validate for invoices (R1), reused by both stores.
- **Capture email *before* payment** → unlocks abandoned-cart recovery + cleaner receipts/reviews/update emails (a deliberate checkout-flow change, no accounts).
- **Stay one-time-payment** → approximate recurring revenue via an annual "all-access pass" (one-time yearly) + repeat paid challenges, instead of subscriptions/accounts.

---

## Suggested execution order

0. **R0 Storefront transparency** (public roadmap page + product screenshots/feature subpages) — apps + courses. ← **best unblocked work now** (R1 waits on accountant).
1. **R1 VAT invoices** (Stripe Tax + Fakturownia + KSeF) — apps + courses. ⛔ blocked on accountant; resume after answers.
2. **RAG engine + pgvector** → ship as **Courses "ask the course"** and **Apps "ask the product"** (same engine, two content sources).
3. **Apps B (order bumps)** + **Courses B (nudge emails)** — fast wins on each side.
4. **Courses C (certificates)** + **Apps C (version-update re-download)**.
5. **Courses D (cohort/challenge)** — the big completion/revenue lever.
6. Then the 🕐 items as appetite allows.

---

*Created 2026-06-21. Source menu: `GROWTH-BACKLOG.md`. Each item becomes its own spec → plan → build when we pick it up.*
