# Growth Backlog — courses.* + apps.* (competitive research → roadmap)

> **Private / internal.** Synthesized from deep web research (2026-06-21) across course
> platforms (Teachable, Thinkific, Kajabi, Podia, LearnWorlds), community/cohort
> (Skool, Circle, Maven, Whop, Heartbeat), digital-commerce (Gumroad, Lemon Squeezy,
> Paddle, Payhip, ThriveCart, SamCart), and 2025-26 AI/edtech trends.
>
> **Our stack (the lens for every "effort" call):** one Next.js 15 + Payload CMS + Stripe app,
> three hosts (main / courses / apps), one-time payments, PL+EN, **owner-operated** (so we
> prize high-value / low-ongoing-labor), **server-side Claude already wired**, an **external
> content REST API** + MCP, lesson `progress` tracking shipped, per-locale tier pricing, BLIK live.
>
> Legend — Effort: **[L]** low / **[M]** medium / **[H]** high · 🚀 game-changer · 💰 revenue lever · 🔁 retention/completion · 🛡️ trust/compliance.
> Stat caveat: most conversion/completion %s come from vendor/creator blogs → directional, not audited.

---

## TL;DR — the bets that actually matter

**The single highest-leverage combo (our AI + content API make this cheap for us, expensive for everyone else):**

> 🚀 **AI "ask-the-course" tutor (RAG over lessons)** + 🚀 **Cohort/Challenge layer** + **AI-generated quizzes/flashcards** + **verifiable completion certificate** + **progress-nudge emails.**
> Together this turns our existing self-paced lessons into a **high-completion (60–90% vs 3–15%), higher-priced, low-owner-time** product with a **built-in viral share loop** — and Claude does the work we'd otherwise pay an instructor for.

**Fastest money (apps + courses), all [L], mostly just Stripe + data we already own:** order bumps · coupons + flash-sale countdown · live social proof from our own orders · post-purchase one-click upsell · sales+pixel analytics.

**Near-mandatory for EU/PL B2B:** 🛡️ VAT invoices (Stripe Tax) + verified-buyer reviews.

**First wave (do these first):** §A1, §A2, §B1, §B2, §C1, §C2 (see roadmap at the bottom).

---

## A. Revenue & checkout levers (apps + courses) — fastest ROI

| # | Idea | Value | Effort | Notes |
|---|------|-------|--------|-------|
| A1 | 💰 **Order bumps** — checkbox add-on at checkout | +15–30% AOV, the #1 cross-validated low-effort lever | **[L]** | extra `line_item` on the Checkout Session + a `bumpProductId` field. Works account-less. |
| A2 | 💰 **Coupons / promo codes** (%, fixed, expiry, usage cap, bulk-unique) | table-stakes for launches/BF/affiliate/win-back | **[L]** | Stripe native Coupons + Promotion Codes; small Payload UI; per-locale. |
| A3 | 💰 **One-click post-purchase upsell** (thank-you page, saved card) | warm buyer + card on file → very high convert | **[M]** | needs `setup_future_usage` / saved PaymentMethod + 2nd PaymentIntent. |
| A4 | 💰 **Bundles** — several courses/products as one discounted SKU | +~55% AOV; "buy the set" | **[L–M]** | bundle product → grants/issues all entitlements; reuses tier logic. |
| A5 | 💰 **Flash sale + real countdown** (server-stored deadline) | urgency lifts convert; **never fake/reset timers** | **[L]** | coupon w/ expiry + countdown component. |
| A6 | 💰 **Pay-what-you-want** (server-enforced floor + suggested) | captures higher willingness-to-pay; goodwill/launch | **[L–M]** | dynamic `price_data`, never trust client min. |
| A7 | **Live social proof** ("1,204 sold", "someone in Kraków just bought") | dynamic proof lifts convert; legitimizes a no-brand store | **[L]** | aggregate our own `orders` — **real counts only**. |
| A8 | **Embeddable buy button / overlay** ("buy on any page") | every blog/landing/partner page becomes a storefront | **[M]** | small JS embed → Checkout Session. Reusable across devince.* . |
| A9 | **BNPL** (Klarna/Affirm) for higher-ticket courses | lowers barrier w/o discounting | **[L]** | just enable the payment methods in Stripe Checkout. |
| A10 | **Sales analytics + marketing pixels** (Meta/TikTok/Google) | can't optimize bumps/PPP/coupons without measuring; enables retargeting | **[L]** | own order data → dashboard + pixel snippets on purchase. |

---

## B. Retention & completion (courses) — fix the 5–15% completion problem

| # | Idea | Value | Effort | Notes |
|---|------|-------|--------|-------|
| B1 | 🔁 **Progress-nudge email automation** — "5 days idle, next lesson 10 min", "finished Module 3 🎉", "not started" | completion is the most-cited fix; → testimonials/referrals/repeat | **[L–M]** | cron over `lesson_progress` (already shipped) + Brevo templates, PL/EN. Claude can personalize copy. Runs unattended. |
| B2 | 🔁 **Verifiable completion certificate** (PDF + public `/verify/<id>`, optional quiz-gated) | trust + completion motivation + **free LinkedIn marketing** (our name as issuer → discovery loop) | **[L–M]** | render HTML→PDF, store issued-cert record, verify page. PL/EN templates. Open Badges 3.0 / LinkedIn "Add to profile" later. |
| B3 | 🔁 **Drip / scheduled unlock** (N-days-after-enroll, fixed date, **prerequisite-gated**) | paces learners → completion; "cohort feel" w/o live; justifies price | **[L–M]** | `releaseAfterDays`/`releaseDate` per lesson; prereq reuses progress data. (Premium variant = "pass quiz to proceed".) |
| B4 | 🔁 **Gamification** — XP/points, badges, **streaks + streak-freeze**, leaderboard | Duolingo: churn 47%→28%, streak users 3.6× stickier, leaderboard +40% lessons/wk | **[M]** | points ledger + level table on existing progress events; leaderboard needs a community/cohort surface. Strongest inside cohorts. |
| B5 | **Quizzes / auto-graded assessments** (MCQ, pass-gate, attempt limits) | active recall → outcomes; makes certs *mean* something | **[M]** | new content type + grading. **Auto-graded only** (manual grading breaks low-overhead). Feeds B2 + cert. |
| B6 | **Adaptive / personalized path** (short diagnostic → next-best lesson) | completion +40–50%; one course serves beginner+intermediate | **[M]** | diagnostic quiz + Claude over `Program.phases → Lessons` graph. |

---

## C. AI-leveraged (our structural edge — Claude + content API already in place)

| # | Idea | Value | Effort | Notes |
|---|------|-------|--------|-------|
| C1 | 🚀 **AI "ask-the-course" tutor (RAG)** — chat grounded *only* in that course's lessons, with citations; Socratic mode | 24/7 instructor at $0 marginal; biggest AI differentiator; answers the "I'm stuck" that kills completion; storefront "wow" | **[L–M]** | **pgvector in our existing Postgres** + embeddings over lesson text + Claude constrained to retrieved chunks. We already have lessons in Payload + the content API. PL/EN free via model. |
| C2 | 🚀 **AI-generated quizzes / summaries / flashcards** from each lesson (at publish time) | turns passive content into active recall; feeds B5/B2; near-free | **[L]** | one Claude pass per lesson in the **ingestion pipeline** → structured Payload fields. No live AI cost at read. |
| C3 | 🚀 **AI PL↔EN translation/transcription** of lessons (text first; audio dub later) | **doubles+ addressable market per course** at ~0 cost; we're already PL+EN | **[L]** text / **[M]** audio | Claude translate in pipeline (we already have i18n); ElevenLabs/HeyGen for dub later. |
| C4 | **AI course-creation assistant** (topic/transcript → outline + lesson drafts straight into Payload) | throughput multiplier *for us* → more SKUs shipped | **[L]** | our AI-agent content ingestion already enables this — just productize an "outline/draft" prompt. |
| C5 | **AI-graded assignments/projects** (rubric + line-by-line feedback; human-review toggle) | enables *real* projects (not just MCQ) at scale w/o us grading; key for cohort credibility + dev courses | **[M]** | rubric prompt + Claude + submission storage; gate cert on pass. Validate before delivery (anti-hallucination). |
| C6 | **AEO / LLM discoverability** — structure catalog + content so ChatGPT/answer-engines cite & recommend our courses | new top-of-funnel competitors haven't optimized; cheap to capture early; compounds across PL+EN | **[L]** | schema.org + Q&A structure + a public AI-friendly catalog endpoint (we have the external API). |

---

## D. Business model & growth loops

| # | Idea | Value | Effort | Notes |
|---|------|-------|--------|-------|
| D1 | 🚀 **Cohort / Challenge layer** on top of self-paced (shared start/finish, daily deliverables, deadline, waitlist + 3-email urgency) | THE 2026 thesis: completion 60–96% vs 3–15%, commands 3–5× price, 15–30% backend convert vs 2–5%. **Fits one-time payments** (sell each cohort/challenge as a one-time SKU). | **[M]** | `cohort` entity (start/enroll-open/close/capacity) + day-gating + waitlist (email + scheduled Stripe checkout). Pairs with AI nudges (B1) + AI grading (C5). |
| D2 | 💰 **Free mini-course / lead-magnet → evergreen funnel** (free 3–5 lessons or apps freebie → 5–7 email nurture → time-limited offer) | turns one-time traffic into an **owned audience** + recurring sales w/o launches; free-community-first converts ~2.7× | **[L–M]** | we already have a lead-magnet concept; add free-tier flag + email capture + sequence runner (Claude drafts copy). |
| D3 | **Affiliate / referral program** (tracked links, attribution via Stripe metadata, commission ledger, manual→Connect payout) | **zero-CAC** growth; happy buyers become sales force; cleanest with one-time digital sales | **[M]** | two-sided reward converts best. Pairs with cert-sharing (B2) + community. |
| D4 | 💰 **PPP / geo-aware pricing** (geo-IP → discount tier, transparent banner, VPN guard via local-payment-method match) | ~+20–50% from price-sensitive geos w/o cannibalizing PL/EU; expands TAM (esp. EN content globally) | **[M]** | geo-IP → auto-coupon; reuses coupon + per-locale price we already have. |
| D5 | **Annual "all-access pass" (one-time yearly)** + repeat paid challenges | ~80% of the MRR benefit **without** subscription machinery/accounts | **[M]** | one-time yearly purchase grants all-courses entitlement; cadence of paid challenges = recurring-ish revenue. **Recommended instead of true subscriptions.** |
| D6 | **Productized coaching/1:1 add-on tier** ("Course + Accelerator" at 3–7× price) | highest margin/buyer; few buyers fund the operation | **[L]** | new Stripe price tier + booking link; AI-prep notes before calls. |

---

## E. Trust & compliance (EU/PL — several are near-mandatory, not optional)

| # | Idea | Value | Effort | Notes |
|---|------|-------|--------|-------|
| E1 | 🛡️ **VAT invoices + receipts** (self-service PDF, buyer enters VAT-ID) via **Stripe Tax** | EU **B2B requires** proper VAT invoices — absence kills B2B convert; self-service kills tickets | **[L–M]** | we already email the link — append receipt + generate locale-correct invoice PDF. |
| E2 | 🛡️ **VAT strategy decision: Stripe Tax (DIY) vs Merchant-of-Record** | biggest compliance call in the category | decision | **Self-hosted = we're the seller → Stripe Tax (compute+collect+VAT-ID validate) + accountant files.** MoR (Lemon/Paddle, ~5%) conflicts with "you are the seller". |
| E3 | **Verified-buyer reviews / ratings + testimonials near CTA** | 98% read reviews pre-buy; testimonial by CTA ~+34% convert; strongest static trust asset for a no-brand store | **[L–M]** | collect via post-purchase email (we have buyer email); "verified" keyed off the order. |
| E4 | 🛡️ **Version updates + free re-download for past buyers** (notify by email) | major **trust/retention** for software/templates ("buy once, get updates"); justifies higher price; cuts refunds | **[M]** | re-issue a fresh HMAC signed link to the new version + email past buyers — **exactly our existing primitive**. (Great for the boilerplate product.) |
| E5 | **License keys** (per-purchase, server-validated `/api/license/validate`, activation limits) | needed if any product is software/app/plugin; anti-piracy + paid-upgrade path | **[M]** | generate on `checkout.session.completed`; design validation server-side. |
| E6 | **Refund self-service / clear guarantee** (signed link within window → Stripe Refund + revoke grant) | money-back guarantee is itself a convert lever; cuts chargebacks (Stripe-account health) | **[L–M]** | keyed off order + email; owner can also refund from Payload admin. |
| E7 | **Abandoned-checkout recovery** (3 emails / 3 days) | ~88% carts abandoned; high-ROI flow | **[M]** | **blocker:** must capture **email before payment** (see structural decision below). |

---

## F. Community (highest retention value, but the most at odds with "low-overhead" — buy-vs-build)

| # | Idea | Value | Effort | Notes |
|---|------|-------|--------|-------|
| F1 | **Gated async discussion attached to each course** (forum-style, searchable/SEO) | course+community ~4.5× revenue & >70% completion vs course-alone; async retains better than real-time for knowledge communities | **[M–H]** | Payload posts/comments gated by ownership. **Ongoing moderation = the real cost.** |
| F2 | **Skool-style points→levels→unlock + leaderboards (7/30/all-time)** | Skool: 28% DAU vs FB groups 3–8%; addictive completion driver; "min level to access" gates lessons | **[M]** | builds on B4; leaderboards = SQL aggregations over points ledger. |
| F3 | **Member directory / networking** (profiles, skills, "skill swap") | peer interaction = top retention driver; makes community feel populated | **[L]** | members already in Payload; gated directory view + skill tags. |
| F4 | **AI community sidekick** (onboarding DMs, discussion prompts, FAQ answers, re-engage inactive) | force-multiplier that keeps a community alive without us online 24/7 | **[M]** | cron + our API + light RAG over lessons. |
| F5 | **Discord/Slack vs native — decision** | — | decision | **Native async is the better long-term fit** (we own auth/payment that makes Discord access-control painful); use Discord only as a temporary stopgap. |

---

## Cross-cutting structural decisions (these gate several features — decide once)

1. **Capture email *before* payment.** Unlocks abandoned-cart recovery (E7), cleaner receipts/reviews/version-update emails. A deliberate checkout-flow change, no accounts needed.
2. **VAT: Stripe Tax (DIY), not Merchant-of-Record.** Self-hosted = we're the seller; MoR removes us as merchant. (E2)
3. **pgvector in our existing Postgres** for RAG (C1) + future AI search — no new infra category.
4. **Stay one-time-payment; approximate MRR via annual all-access pass + repeat challenges (D5)** rather than introducing subscriptions/accounts (which several "memberships" features would force).
5. **Buy-vs-build community (F).** Highest value, highest ongoing-labor; decide if we want to own moderation before building native.

---

## Recommended roadmap (waves by value-to-effort)

**Wave 1 — "free money + completion", all [L], leans on Stripe + data we own + Claude pipeline:**
A1 order bumps · A2 coupons · A5 flash-sale countdown · A7 live social proof · A10 analytics+pixels · B1 progress-nudge emails · **C2 AI quizzes/flashcards** · **C3 AI PL↔EN translation** · C6 AEO catalog.

**Wave 2 — the differentiators (biggest revenue/retention/AI levers):**
🚀 **C1 AI ask-the-course tutor** · 🚀 **D1 cohort/challenge layer** · B2 verifiable certificate · B3 drip · E1 VAT invoices · E3 reviews · E4 version-update re-download · D2 free-mini-course funnel · A3 post-purchase upsell · A4 bundles.

**Wave 3 — scale & growth loops:**
B4 gamification · B5 auto-quizzes · C5 AI grading · D3 affiliate · D4 PPP pricing · D5 annual all-access pass · D6 coaching tier · E5 license keys · A8 embeddable checkout · F (community, after buy-vs-build call).

---

## Explicitly skip / defer for a low-overhead owner-operated model
- ❌ Native white-label **mobile app** → do a **PWA** (manifest + service worker + web push) instead — ~80% of value at ~5% of cost; push enables streak/nudge re-engagement.
- ❌ **Manual-graded** assignments → auto-graded quizzes (B5) + AI grading (C5) only.
- ❌ Native **live-video** infra → manage calendar + gated Zoom/Meet link + reminders.
- ❌ True **subscriptions/memberships** (forces accounts) → D5 annual pass + repeat challenges.
- ❌ **Wishlists** → low value without accounts.
- ⚠️ **SCORM** — only if chasing corporate/LMS buyers; otherwise skip.

---

*Generated 2026-06-21 from 4 parallel research streams (~210k research tokens). Full source URLs are in each stream's agent output / session log. Numbers are directional (vendor/creator blogs) — validate the ones we'd bet money on.*
