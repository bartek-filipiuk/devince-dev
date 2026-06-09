# Spec: Płatna platforma kursowa gated — `courses.devince.dev`

> Status: zatwierdzony design (2026-06-09). Źródło: `docs/COURSE_PLATFORM_BLUEPRINT.md` + weryfikacja istniejącego kodu + brainstorm.
> Projekt **B** z pary A (lokalizacja) / B (kurs). Niezależny od A poza wspólnym `src/middleware.ts` (patrz „Zależności").

## 1. Cel

Hostować **płatny kurs „od pomysłu do wdrożenia apki na Claude Code"** za authem, per-user:
- treść (lekcje + Explorer + bundle skilli + PDF) gated, dostęp per zakupiony Program;
- dostęp nadawany **automatycznie po zakupie przez Stripe** (webhook = źródło prawdy);
- po zakupie user dostaje **mail z linkiem aktywacyjnym** (Brevo) → ustawia hasło → loguje się;
- subdomena `courses.devince.dev` na tej samej instancji Payload/Next.

**Zasada nadrzędna:** rozszerzamy istniejące modele (`Program`, `Users`, `access`), NIE duplikujemy. Treść kursu żyje w `~/skills-projects/idea-to-mvp-course/`.

## 2. Decyzje (zatwierdzone)

| Decyzja | Wybór |
|---|---|
| Model lekcji | Nowa kolekcja `Lessons` + import md → Lexical |
| Auth kupującego | Natywne hasło Payload + link aktywacyjny po zakupie; natywny reset hasła |
| Wideo | Brak infrastruktury; opcjonalne pole YouTube iframe na lekcji (pomoc, nie produkt) |
| Treść kursu v1 | **Tylko PL** (gated content); marketingowy landing lokalizowalny później |
| Stripe | **Payment Link** v1 (CTA na landingu); webhook `checkout.session.completed` = źródło prawdy |
| Hosting kursu | Subdomena `courses.devince.dev` (Coolify: dodatkowa domena tej samej aplikacji) |

## 3. Stan obecny (zweryfikowany)

- **`Program`** (`src/collections/Program/index.ts`): typ `course|workshop|event`; taby Hero/Szczegóły/Treść(`layout` blocks)/SEO; `pricing: free|paid` — **dziś tylko etykieta UI, zero egzekwowania**. `access.read = authenticatedOrPublished` (published = world-readable). Wersje/drafty/autosave włączone.
- **`Users`** (`src/collections/Users/index.ts`): Payload native `auth: true`; tylko pole `name`; **brak** `roles`/`purchases`/`hasAccess`. `access.*` = `authenticated` (admin-shaped).
- **Access** (`src/access/`): `anyone`, `authenticated`, `authenticatedOrPublished` (zwraca `boolean | Where`).
- **Render Programu**: `src/app/(frontend)/program/[slug]/page.tsx` — `force-dynamic`, `queryProgramBySlug` → `RenderBlocks`. **Punkt wpięcia gatingu** (linie 37-55).
- **Stripe**: ZERO (brak SDK, webhooków, kluczy). `formBuilderPlugin` ma `payment: false`.
- **Brevo**: tylko newsletter DOI (`src/app/(frontend)/api/newsletter/subscribe/route.ts`); brak transactional. Klucze tylko w `.env.example` (komentarz).
- **Wideo**: brak.
- **Assety kursu**: `~/skills-projects/idea-to-mvp-course/` — `curriculum/*.md` (00-intro, 01-setup, phase-A…I, capstone-build-along, config-presets, resources), `dist/explorer.html`, `bundle/` (3 skille + INSTALL + ZIP), `lead-magnet/` (DARMOWE — NIE gate'ować). Landing PL: `content/course-od-pomyslu-do-wdrozenia*.md`.
- **Konwersja md→Lexical**: istnieje w MCP (`mcp-server/src/tools/programs.ts` `set_program_layout`) — reużyć przy imporcie.

## 4. Architektura

```
Landing Programu (publiczny, marketing)   →  CTA = Stripe Payment Link
        │                                          │
        │ zakup                                     ▼
        ▼                                   Stripe Checkout
  /learn/[program]/[lesson] (GATED)               │ checkout.session.completed
        ▲                                          ▼
        │ sesja Payload                     Webhook (verify sig + idempotent)
        │                                          │
  /login ◄── /set-password?token ◄── Brevo mail ◄─ nadanie dostępu (Users.purchases += program)
```

## 5. Workstreamy

### B0 — Routing subdomeny `courses.devince.dev`
- Coolify: dodaj `courses.devince.dev` jako kolejną domenę istniejącej aplikacji (ten sam kontener). DNS: rekord A/CNAME na serwer.
- `src/middleware.ts`: wykryj `request.headers.get('host')`. Gdy host = subdomena kursowa → ustaw flagę/nagłówek `x-app=courses` (do kanonicznych linków). Trasy kursowe (`/learn/*`, `/login`, `/set-password`, `/forgot-password`, `/account`, landing kursu) działają niezależnie od hosta; subdomena je kanonizuje (canonical + linki budowane na `courses.devince.dev`).
- **Uwaga (zależność z A):** host-check **dokładany na wierzch** rewrite'u `[locale]` z Projektu A. Trasy kursowe (auth/learn) są **locale-neutral** (kurs PL-only v1) — wyłączone z rewrite `[locale]` jak `api`.
- `cors`/`getServerSideURL`: dopuść subdomenę.

### B1 — Model danych
**Nowa kolekcja `src/collections/Lessons/index.ts`:**
- `title` (text, required)
- `program` (relationship → `program`, required)
- `phase` (text lub select — fazy A–I + intro/setup/capstone)
- `order` (number — kolejność w kursie)
- `type` (select: `text` | `embed` | `video` | `download`, default `text`)
- `content` (richText Lexical; PL-only v1 → bez `localized`)
- `youtubeEmbedUrl` (text, opcjonalny — iframe-pomoc)
- `downloadFile` (upload → `media`, warunkowo dla `type=download`; bundle ZIP / playbook PDF)
- `slug` (`slugField`) + `publishedAt` + wersje/drafty (wzorzec jak Program)
- `access.read = enrolledOrAdmin` (B2); `create/update/delete = adminOnly`.

**Rozszerzenie `Program`:** dodaj (tab Szczegóły lub nowy „Kurs"):
- `stripePaymentLink` (text — URL Payment Linka; widoczne gdy `pricing=paid`)
- opcj. `stripePriceId` (text — pod przyszły Checkout Session)
- relacja do lekcji: `join` field (Payload `join` na `Lessons.program`) albo lista — preferowany `join`.

**Rozszerzenie `Users`:**
- `roles` (select hasMany: `admin` | `customer`; default `['customer']`; istniejący userzy → `admin` przez migrację/seed).
- `purchases` (relationship → `program`, hasMany — kupione programy).
- Poluzuj `access`: `read`/`update` = self (`{ id: { equals: user.id } }`) lub admin; `create` = admin (konta tworzy webhook przez Local API z `overrideAccess`).

`pnpm generate:types` po zmianach. `Lessons` dodane do `collections` w `payload.config.ts`.

### B2 — Access control / gating
- Nowa funkcja `src/access/enrolledOrAdmin.ts`: `admin` → `true`; `customer` → `Where { program: { in: user.purchases } }`; niezalogowany → `false`.
- Landing Programu **pozostaje publiczny** (marketing/sprzedaż).
- **Strona lekcji** `src/app/(frontend)/learn/[program]/[lesson]/page.tsx` (locale-neutral, `force-dynamic`): SSR sprawdza sesję + enrollment (`user.purchases` zawiera program). Brak dostępu → redirect na `/login?next=…` lub paywall (CTA Payment Link).
- **Gated downloads** (ZIP/PDF) i **Explorer**: serwowane przez authenticated route handler (`src/app/(frontend)/api/course/download/[id]/route.ts`, `.../explorer/[program]/route.ts`) z weryfikacją enrollmentu; brak publicznego URL do plików.
- Egzekwuj `pricing: paid` — funkcja gatingu jest jedynym źródłem prawdy dostępu.

### B3 — Auth kupującego (hasło + aktywacja)
- Konta tworzy **webhook** (B4) przez Local API (`overrideAccess: true`), `roles: ['customer']`.
- Aktywacja: webhook generuje token resetu (Payload `forgotPassword` / `resetPasswordToken`), Brevo wysyła link `https://courses.devince.dev/set-password?token=…`.
- Strony Next (locale-neutral): `/set-password` (ustaw hasło przez token → `resetPassword`), `/login` (email+hasło → `login`, sesja cookie), `/forgot-password` (natywny `forgotPassword`), `/account` (lista `purchases` + linki do `/learn/...`).
- Wykorzystać Payload Auth (Local API w route handlerach lub REST `/api/users/...`). Sesja = cookie Payload (HTTP-only).
- Rate-limit na `/login`, `/forgot-password`, `/set-password`.

### B4 — Stripe
- Dodaj `stripe` (SDK). Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, (`STRIPE_PRICE_ID` pod przyszły Checkout). Dodaj do `.env.example`.
- **Sprzedaż v1**: Payment Link (no-code) jako `Program.stripePaymentLink`, CTA na landingu.
- **Webhook** `src/app/(frontend)/api/stripe/webhook/route.ts` (wzorzec jak `api/newsletter/subscribe`; `api/*` jest poza rewrite `[locale]`; raw body przez `await request.text()`):
  1. `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)` — **weryfikacja podpisu** (raw body, nie sparsowany JSON).
  2. **Idempotencja**: kolekcja `src/collections/StripeEvents/index.ts` (`eventId` unique) — jeśli `event.id` już przetworzony, zwróć 200 bez akcji.
  3. `checkout.session.completed`: ustal `customer_email` + kupiony Program (po `price`/`payment_link`/metadata). `payload.find/create` user po emailu (`overrideAccess`), dopisz Program do `purchases` (bez duplikatów).
  4. Odpal Brevo (B5) z linkiem aktywacyjnym (lub samym loginem, jeśli konto istniało).
  5. Zapisz `event.id` w `StripeEvents`. Zwróć 200.
- **Bezpieczeństwo:** zawsze verify signature + idempotency (bez tego: double-grant / spoof). Body parsing wyłączony dla tej trasy (raw).
- Stripe receipt: zostaw włączony w dashboardzie (dowód płatności).

### B5 — Brevo transactional
- Helper `src/utilities/brevo.ts` `sendTransactionalEmail({ to, templateId|htmlContent, params })` → Brevo `POST /v3/smtp/email`. Reużyj `BREVO_API_KEY`.
- Env: `BREVO_API_KEY` (już w `.env.example`), `BREVO_COURSE_ACCESS_TEMPLATE_ID`.
- Treść: „Twój dostęp do kursu" + link aktywacyjny `/set-password?token=…` (lub `/login` gdy konto istniało) + nazwa Programu.
- Działa tylko w trybie live Brevo (test/sandbox nie wysyła) — patrz testowanie.

### B7 — Import treści
- Skrypt `src/endpoints/seed/course.ts` (lub `scripts/import-course.ts`): czyta `~/skills-projects/idea-to-mvp-course/curriculum/*.md`, konwertuje md→Lexical (reużyj funkcji z `mcp-server/src/tools/programs.ts`), tworzy/aktualizuje `Lessons` powiązane z Programem kursu, ustawia `phase`+`order` wg nazw plików (00-intro→…→capstone→resources).
- `dist/explorer.html` → gated asset (Media lub `public/` + authenticated route z §B2).
- `bundle/*.zip` + playbook PDF → upload do Media; `Lessons type=download` + `downloadFile`.
- **NIE importować** `lead-magnet/` (darmowy, vendor-neutral, osobny landing — poza tym specem).
- Landing Programu: treść z `content/course-od-pomyslu-do-wdrozenia*.md` (już w repo) → bloki layout Programu (MCP `set_program_layout` lub ręcznie w CMS).

## 6. Zmienne środowiskowe (nowe)

```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...            # opcjonalnie (przyszły Checkout)
BREVO_API_KEY=...                    # już w .env.example
BREVO_COURSE_ACCESS_TEMPLATE_ID=...
NEXT_PUBLIC_COURSES_URL=https://courses.devince.dev
```

## 7. Obsługa błędów / bezpieczeństwo

- **Webhook**: nieprawidłowy podpis → 400; nieznany event → 200 (ignore); błąd DB → 500 (Stripe ponowi); zawsze idempotentnie.
- **Gating**: brak sesji → redirect login; sesja bez enrollmentu → paywall (nie 403 z białą stroną). Pliki gated nigdy bez weryfikacji.
- **Aktywacja**: token jednorazowy, wygasający (natywny Payload); link tylko w mailu.
- **PL/VAT**: przy Stripe sprzedawcą jesteście wy → rozważyć Stripe Tax (poza zakresem v1, do odnotowania właścicielowi).
- **Auth**: rate-limit ścieżek auth; cookie HTTP-only; nie logować tokenów.

## 8. Testowanie

- **Webhook**: Stripe CLI (`stripe listen` + `stripe trigger checkout.session.completed`) — bo maile/receipty nie idą w sandbox. Test: idempotencja (podwójny event → jeden grant), spoof (zły podpis → 400), match user po emailu (nowy + istniejący).
- **Gating**: user bez zakupu nie wejdzie na `/learn/...` ani nie pobierze ZIP/PDF/Explorera; user z zakupem wejdzie. Test access function jednostkowo (`enrolledOrAdmin` zwraca `Where`/bool).
- **Auth flow E2E** (Playwright): zakup (mock webhook) → mail link → set-password → login → `/account` → `/learn/...`.
- **Import**: po imporcie liczba `Lessons` = liczba lekcji w `curriculum/`, kolejność poprawna, treść jako Lexical.

## 9. Granice / poza zakresem v1

- Brak własnego hostingu wideo (tylko YouTube iframe-pomoc).
- Kurs gated = PL-only (landing lokalizowalny później przez Projekt A).
- Brak kuponów/dynamicznej ceny (Payment Link); Checkout Session jako przyszłe rozszerzenie (`stripePriceId` już przygotowane).
- Lead magnet (darmowy) — osobny temat, nie tutaj.
- Stripe Tax / faktury VAT — do decyzji właściciela, poza v1.

## 10. Zależności i kolejność (pod subagentów)

- **Wspólny plik z Projektem A: `src/middleware.ts`** — host-check B0 dokładany **po** rewrite `[locale]` z A1.
- Wewnątrz B: **B1 (model) pierwszy** → potem **B2 / B3 / B4 równolegle** → **B5 po B4** → **B7 po B1/B2**. B0 niemal niezależny (poza wspólnym middleware).
- `pnpm generate:types` po B1 (blokuje typowo B2/B3/B4 korzystające z `User.purchases`/`Lessons`).
