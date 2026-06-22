# HANDOFF — devince.dev platform (stan: 2026-06-21)

> Czytasz to po `/clear`. Cel: wskoczyć od razu. Pełna mapa + flow sprzedaży: `docs/PLATFORM-OVERVIEW.md`. Jak edytować treść/menu przez API: `docs/EXTERNAL-CONTENT-API.md`. Append-log każdej zmiany: `.git/sdd/progress.md`.

## Struktura — 1 repo, 1 apka, 3 twarze

JEDNO repo (`devince.dev`) = jeden Next.js 15 + Payload CMS 3 + Postgres, jeden kontener. `src/middleware.ts` routuje po HOŚCIE:

| Host | Co | Folder | Sprzedaje |
|---|---|---|---|
| devince.dev | strona marketingowa (pages/blog/projects/legal/menu) | `src/app/(frontend)/[locale]/` | — |
| courses.devince.dev | sklep + odtwarzacz kursów (lekcje, postęp, konto) | `src/app/courses-app/` | `Program` (kursy) |
| apps.devince.dev | sklep z plikami (bez konta, download-grant) | `src/app/apps-app/` | `Products` (downloadable) |
| /admin | panel Payload | `src/app/(payload)/` | — |

- **Kolekcje** `src/collections/`: Program+Lessons · Products · DownloadGrants · Users · Pages/Posts/Projects · Media + AppAssets/CourseAssets (prywatne) · StripeEvents · LessonProgress.
- **Globale**: `src/Header` (menu) · `src/Footer` · `src/SiteSettings`. **Style**: `theme.css` / `courses-app/course-theme.css` / `apps-app/app-theme.css`.
- **Płatności**: jeden live Stripe + jeden webhook `api/stripe/webhook` (branch po metadata: productId→apps, programId→courses, ndqsCourseId→NDQS). Checkout: `api/apps/checkout`, `api/courses/checkout`. Maile: `src/utilities/brevo.ts`.
- **External content API** `api/external/*` (Bearer EXTERNAL_API_TOKEN z Coolify): programs, products, lessons, pages, posts, projects, media, app-assets, **header**.
- **Drugie repo**: `/home/bartek/main-projects/course-platform-starter` — sprzedawalny boilerplate (platforma minus NDQS). 4. twarz `learn.devince.dev` = osobne repo NDQS (`courses-platform`).
- **Deploy**: Coolify app `nwgk0s00440skc0kwsskw4w4`, z `main`, `npx payload migrate && node server.js` (fail-fast). Schemat WYŁĄCZNIE przez migracje (`push:false`).

## Stan: WSZYSTKO LIVE na prodzie

courses.* + apps.* + devince.dev + /admin — wszystkie działają. Z ostatnich sesji (wszystko zmergowane na `main` + wdrożone + zweryfikowane):
- **Courses Pro UX** (PR #44/#45): czytnik lekcji (prose+Shiki+TOC) + postęp; storefront/account personalizacja + featured + sidebar-scroll.
- **Apps tiers** (PR #47): progi cenowe Starter/Pro/Agency (selektor na stronie produktu), cena liczona server-side per tier.
- **Per-locale ceny** (PR #50): `tiers.priceCents`+`currency` lokalizowane → PL i EN niezależnie (PL PLN, EN USD). Checkout czyta cenę w locale kupującego.
- **Async płatności** (PR #51): webhook obsługuje Przelewy24/BLIK (`async_payment_succeeded/failed`). BLIK aktywny; P24 odrzucony przez P24 (prohibited business — downloadable software).
- **Panel sprzedaży** (PR #52): DownloadGrants += tier/amountPaid/currency → admin = „kto kupił co, za ile".
- **Seller-email** (PR #53): mail „nowa sprzedaż" do bartek@devince.dev przy każdym zakupie (obok Discord).
- **Storefront apps redesign** (PR #54/#55): karty z placeholder-gradientami + tagline + cena „od X" per-locale + CTA; hero z wizualnym teaserem.
- **Header API + menu** (PR #56/#57/#58): `/api/external/header` GET+PATCH; menu główne: Kursy→`courses.devince.dev`, dodany Apps→`apps.devince.dev` (PL+EN).

Produkty na apps store: `course-platform-starter` (boilerplate, tiered), `idea-to-mvp` (WIP). `test-1--apps` odpubliczniony.

## OTWARTE PUNKTY (do zrobienia)
- ⚠️ **Ceny testowe**: Starter na `course-platform-starter` jest tymczasowo `2 zł / $1` (test BLIK/karta). PRZYWRÓCIĆ do `149 zł / $49` (PATCH `/api/external/products/course-platform-starter?locale=pl|en` z tiers; payloady-wzorce w `/tmp/i18n-content/pl-pln.json`+`en.json` jeśli istnieją, albo odtworzyć: Starter 14900 pln / 4900 usd).
- **idea-to-mvp**: realny WIP, brak opisu+ceny → karta uboga. Dodać treść (title/description/tiers) gdy właściciel da.
- **Stripe Dashboard (właściciel)**: P24 odrzucony, BLIK działa — nic do zrobienia tam, chyba że ktoś chce inne metody.
- **Security**: 6 Low hardening items zostały z auditu — patrz [[devince-security-audit]] (m.in. rotacja zacommitowanego klucza OpenRouter).

## 🆕 NOWE FUNKCJE — ROADMAPA (najświeższe, 2026-06-21)
> Zrobiony gruby competitive research → **`docs/ROADMAP.md`** = committed plan, **`docs/GROWTH-BACKLOG.md`** = menu badawcze. Pełny stan: pamięć [[devince-feature-roadmap]]. **Czytaj `docs/ROADMAP.md` zanim zaczniesz feature work.**
- **✅ ZROBIONE — R0a: publiczna roadmapa** (LIVE 2026-06-22, PR #59). Strony `/roadmap` na apps+courses (PL/EN), global Payload `Roadmap` (lokalizowany), `RoadmapView` + `roadmap.css` na zmiennych theme, grupy done/planned/in_progress, link w nav. **Edycja przez API** (PR #60): `GET/PATCH /api/external/roadmap?locale=pl|en` (Bearer `EXTERNAL_API_TOKEN` z Coolify), recipe jak header: PATCH pl→ids w odpowiedzi→PATCH en z id. Prod zaseedowany 13 pozycjami (kurowane, **bez VAT**). Spec/plan: `docs/superpowers/{specs,plans}/2026-06-21-public-roadmap*`. **R0b (screeny+lista funkcji na produktach) = nadal w backlogu.**
- **🔜 NASTĘPNE: R1 — faktury VAT** (apps+courses). Stripe Tax (DIY, **nie** Merchant-of-Record bo self-hosted=my sprzedawcą). Powód: EU/PL B2B potrzebuje faktury. Każdy item → osobny `superpowers:brainstorming` → spec → plan → build.
  - **⚠️ R1 STATUS = ZABLOKOWANE na konsultacji z księgową** (research 2026-06-21, pełny dokument **`docs/R1-VAT-faktury-research.md`**). Ustalenie: sprzedawca = **czynny VAT**; **sama faktura Stripe NIE jest zgodną fakturą VAT** (art. 106e) i **KSeF B2B obowiązuje od 1.04.2026** (Stripe nie wpuszcza XML do KSeF). **B2C zwolnione z KSeF.** Najlżejsza zgodna ścieżka: **Stripe (płatność+NIP+Stripe Tax) → webhook → Fakturownia wystawia fakturę + KSeF dla B2B → mail z PDF.** **DZIŚ wystawiamy 0 faktur** (checkout bez `invoice_creation`/`tax_id_collection`/Stripe Tax) — a Regulamin obiecuje faktury = żywa luka. Czekamy na odpowiedzi księgowej (pytania w dokumencie) zanim ruszymy build.
- **Wspólny silnik RAG** (pgvector + Claude): „ask the course" (lekcje) = „ask the product" (docsy produktu, chat pre-sale na apce). Budujemy raz, dwa źródła.
- **Polityka:** budujemy w **devince first**, do paczki `course-platform-starter` **backport później** (selektywnie). NIC nowego do paczki teraz.
- Kolejność: R1 VAT → silnik RAG (oba „ask") → order bumps + nudge-maile → certyfikaty + version-update re-download → cohort/challenge.
- Struktura decyzji: email PRZED płatnością; zostajemy one-time (roczny „all-access pass" zamiast subskrypcji); Stripe Tax nie MoR; pgvector.

## TWARDE ZASADY
- Schemat tylko przez migracje (`push:false`); po zmianie modelu: `pnpm generate:types` + `pnpm payload migrate:create <n>` (+ commit .ts I .json snapshot — wyjątek stray `20260618_200715_program_price.json` NIE commitować). Dev DB localhost:5436.
- Migracja generowana przez Payload często NIE robi backfillu / dodaje `NOT NULL` bez defaultu → na niepustej prod tabeli PADNIE. Ręcznie: nullable→backfill→NOT NULL; przenieś dane przed dropem. Walidować na DEV z NIEPUSTYMI tabelami (main + version `_products_v_*`).
- `EXTERNAL_API_TOKEN`/sekrety z Coolify — nigdy nie echować. Branch od `main`, PR, merge, deploy. Respond po polsku.
- Bash: dev-server zabijać `fuser -k 3010/tcp` (po porcie), NIGDY `pkill -f 'next dev'`/szeroki pgrep (exit 144 + collateral na innych projektach).

## NARZĘDZIA WERYFIKACJI
- Lokalnie: `pnpm test:int` (~270 testów), `pnpm build`, dev na :3010 (apps/courses host: Playwright `--host-resolver-rules=MAP <host> 127.0.0.1` lub nagłówek Host).
- Prod smoke: Coolify deploy GET `/api/v1/deploy?uuid=nwgk0s00440skc0kwsskw4w4` + poll `/api/v1/deployments/<uuid>`. Stripe/Brevo: API z kluczem z Coolify (read-only sprawdzenia).
- DevTools MCP NIEDOSTĘPNY → wizualne sprawdzenia przez Playwright (screenshot + ekstrakcja DOM).
