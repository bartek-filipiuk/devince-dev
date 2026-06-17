# Spec: `apps.devince.dev` — sklep z plikami do pobrania (one-time Stripe, bez konta)

> Status: zatwierdzony design (2026-06-10, decyzje pre-autoryzowane przez właściciela — patrz `docs/HANDOFF.md`).
> Drugi z pary: **Projekt 2 (apps.\*)**. Wzorzec = **Projekt 1 (courses.\*)** (`2026-06-10-courses-subdomain-design.md`); fundament migracji (Faza 0) jest już zrobiony tam.

## 1. Cel

Sklep z **plikami do pobrania** (aplikacje, paczki, zasoby) na dedykowanej subdomenie `apps.devince.dev`:

- **storefront**: lista opublikowanych produktów z paginacją,
- **strona produktu**: opis + cena + przycisk „Kup" → Stripe Checkout,
- **zakup BEZ KONTA**: po opłaceniu webhook tworzy podpisany, wygasający grant pobrania i wysyła mail (Brevo) z linkiem,
- **pobranie**: link `apps.devince.dev/download/<token>` → walidacja (podpis + expiry + limit użyć) → **streaming pliku z prywatnego storage** (zero publicznych URL-i),
- ten sam design co courses.\* (theme Sylabus, dark-first + light toggle), pełna izolacja od głównej `devince.dev`.

## 2. Decyzje (pre-zatwierdzone)

| Decyzja | Wybór |
|---|---|
| Model sprzedaży | One-time payment (Stripe Checkout Session), **bez konta użytkownika** |
| Dostarczenie | Mail (Brevo) z podpisanym, wygasającym linkiem pobrania |
| Pliki | PRYWATNE — osobna upload-kolekcja wzorowana na `course-assets`, poza `public/` |
| Subdomena | `apps.*` → host-rewrite w middleware → realny segment `src/app/apps-app/` (DOKŁADNIE wzorzec courses) |
| Design | Reużycie/adaptacja `src/app/courses-app/course-theme.css` |
| Schemat DB | WYŁĄCZNIE migracje (`push:false` już ustawione); każda zmiana = `migrate:create` + commit |
| Baza brancha | **`feat/apps-subdomain` stackowany na `feat/courses-subdomain`** (PR #15) — patrz §3 |

### Odejście od litery promptu (udokumentowane)

Prompt nocny mówił „branch od `main`", ale **wszystkie prerekwizyty** (push:false + baseline migracji + runner `scripts/migrate.mjs` + middleware host-rewrite + `courses-app/course-theme.css`) istnieją TYLKO na `feat/courses-subdomain` (PR #15, niezmergowany). Branch od `main` = przekopiowanie połowy PR #15 i gwarantowane konflikty. Dlatego apps stackuje się na courses; PR #15 merguje się rano przed PR-em apps.

## 3. Stan obecny (zweryfikowany w kodzie)

- **Stripe webhook** (`src/app/(frontend)/api/stripe/webhook/route.ts`): verify signature na raw body, idempotencja przez `stripe-events` (unique `eventId`, zapis na końcu), obsługa `checkout.session.completed` → fulfillment kursów przez `metadata.programId`. **Rozszerzamy o gałąź `metadata.productId`** (apps) — ten sam endpoint, wspólna idempotencja.
- **Brevo** (`src/utilities/brevo.ts`): `sendTransactionalEmail` (templateId lub subject/html) + `sendCourseAccessEmail`. Dodamy `sendDownloadLinkEmail`.
- **Prywatny storage** (`src/collections/CourseAssets/index.ts`): upload-kolekcja z `staticDir` poza public/ (`private-media/`), wszystkie access admin-only; streaming przez dedykowaną trasę (wzorzec `api/course/download/[id]/route.ts`: path-traversal guard, Content-Disposition, no-store).
- **Middleware** (`src/middleware.ts`): host-rewrite `courses.*` → `/courses-app${pathname}`, blokada bezpośredniego `/courses-app` na main hoście (redirect na subdomenę), `COURSE_PAGE_PREFIXES`. **Analogiczna gałąź dla `apps.*` → `/apps-app`.**
- **Theme** (`src/app/courses-app/course-theme.css` + layout + theme toggle bez FOUC): do reużycia/adaptacji.
- **Migracje**: `push:false`, `migrationDir src/migrations`, baseline `20260610_193458_init` + 2 migracje kursowe; runner `scripts/migrate.mjs`; ref-baza `payload_ref` do `migrate:create`.

## 4. Model danych (nowe kolekcje — przez migrację)

### `Products` (downloadable)
- `title` (text, required), `slug` (unique, index),
- `description` (richText),
- `priceCents` (number, required) + `currency` (select, default `pln`) — wyświetlanie ceny; **`stripePriceId`** (text, opcjonalny — gdy ustawiony, Checkout używa Price; inaczej `price_data` ad-hoc z `priceCents`),
- `downloadFiles` (relationship → `app-assets`, hasMany) — pliki dostarczane po zakupie,
- `coverImage` (upload → `media`, opcjonalne) — karta/hero produktu,
- `_status` (versions+drafts jak Program) — tylko `published` w storefroncie,
- tab SEO (`generateMeta` jak Program).
- Access: read = published-or-admin; create/update/delete = admin-only. **Field-level access nie wymagane** (brak pól wrażliwych edytowalnych przez nie-adminów — kolekcja w całości admin-write; pamiętać o lekcji z [[payload-field-access-mass-assignment]] przy każdym przyszłym polu).

### `AppAssets` (prywatna upload-kolekcja)
- Kopia wzorca `CourseAssets`: `staticDir` → `private-media-apps/` (osobny katalog od kursów), access admin-only na wszystkich opach, pole `alt`.

### `DownloadGrants`
- `token` (text, unique, index) — **HMAC-podpisany token** (patrz §5),
- `product` (relationship → products, required),
- `email` (text, required) — adres kupującego (z Checkout Session),
- `expiresAt` (date, required) — domyślnie +7 dni od zakupu,
- `maxUses` (number, default 5), `uses` (number, default 0),
- `stripeSessionId` (text, index) — audyt + idempotencja fulfillmentu (re-delivery tego samego session ⇒ nie tworzymy drugiego grantu).
- Access: WSZYSTKO admin-only (granty tworzy wyłącznie webhook przez `overrideAccess: true`; walidacja pobrania czyta przez `overrideAccess: true` po stronie serwera).

`pnpm generate:types` po zmianach; migracja `apps_store_model` z `payload_ref`.

## 5. Token pobrania — kryptografia (TDD)

Moduł `src/utilities/downloadToken.ts`:

- `signDownloadToken({ grantId, secret })` → `"<grantId>.<hmacHex>"` — HMAC-SHA256(grantId, secret), secret = `DOWNLOAD_TOKEN_SECRET` (env, wymagany).
- `verifyDownloadToken({ token, secret })` → `{ valid: boolean, grantId?: string }` — **timing-safe compare** (`crypto.timingSafeEqual`), odporne na malformed input (brak kropki, zły hex, puste).
- Token w DB (`DownloadGrants.token`) = pełny podpisany string; walidacja pobrania: (1) verify HMAC **zanim** dotkniemy DB (tani odrzut), (2) lookup grant po tokenie, (3) `expiresAt > now`, (4) `uses < maxUses`.
- Inkrementacja `uses` przy udanym pobraniu (best-effort; race między równoległymi pobraniami akceptowalny dla v1 — limit jest miękki).

## 6. Przepływ zakupu (bez konta)

1. **Strona produktu** → przycisk „Kup" → `POST /api/apps/checkout` (server route): tworzy **Stripe Checkout Session** z `metadata.productId`, `mode: 'payment'`, `success_url: https://apps.devince.dev/success?session_id={CHECKOUT_SESSION_ID}`, `cancel_url` → strona produktu. Linia: `stripePriceId` jeśli jest, inaczej `price_data` z `priceCents`/`currency`/`title`.
2. **Webhook** (`checkout.session.completed`, istniejący endpoint): jeżeli `metadata.productId` (nie `programId`):
   - idempotencja eventu jak dziś (stripe-events) **+** idempotencja fulfillmentu: jeśli istnieje grant ze `stripeSessionId == session.id` → skip,
   - utwórz `DownloadGrant` (token = sign(grantId) — tworzenie dwustopniowe: create → sign(id) → update token; albo token z losowego UUID podpisanego — wybór w planie),
   - Brevo `sendDownloadLinkEmail({ to, link: https://apps.devince.dev/download/<token>, productTitle })` — best-effort jak w kursach (failure ≠ retry storm; grant istnieje, admin może wysłać ręcznie).
3. **`/success`** (strona na apps-app): „Dziękujemy — sprawdź mail" (+ uwaga o spamie). Bez auto-fulfillmentu po stronie klienta (webhook jest źródłem prawdy).
4. **`/download/<token>`** (strona na apps-app): pokazuje produkt + listę plików z przyciskami pobrania → `GET /api/apps/download/<token>?file=<assetId>`.
5. **`GET /api/apps/download/[token]`** (route handler, współdzielony `/api`): walidacja wg §5 → 403 (invalid/expired/limit) bez info-leaków; sukces → streaming pliku z `private-media-apps/` (wzorzec path-traversal guard + Content-Disposition z course download route). Parametr `?file=` musi należeć do `product.downloadFiles` grantu.

## 7. Subdomena + strony (`src/app/apps-app/`)

- **Middleware**: gałąź `apps.*` → rewrite `/apps-app${pathname}`; `/apps-app` w `EXCLUDED_PREFIXES` (locale-neutral, PL-only); blokada bezpośredniego `/apps-app` na main hoście (redirect na `https://apps.devince.dev`); `APP_PAGE_PREFIXES` — apps NIE ma stron auth (bez konta!), więc lista pusta lub tylko `/download`,`/success` jeżeli kolidują z (frontend) — do weryfikacji w planie.
- **Layout** (`apps-app/layout.tsx`): własny root layout jak courses (html.dark, theme toggle bez FOUC, nav „Devince · apps", footer) + `app-theme.css` (adaptacja `course-theme.css`; wspólne tokeny, ewentualnie inny akcent).
- **Strony**:
  1. `/` storefront — `payload.find` products `{ _status: published }`, karty (tytuł, opis skrót, cena mono, cover), paginacja jak courses, stan pusty.
  2. `/[slug]` produkt — hero (tytuł, opis richText, cena), przycisk „Kup" (client component → POST checkout → redirect na Stripe), SEO `generateMeta`.
  3. `/success` — statyczna „sprawdź mail".
  4. `/download/[token]` — walidacja server-side; valid → lista plików do pobrania; invalid/expired → komunikat z instrukcją kontaktu.
- 404 w themie apps (`not-found.tsx`).

## 8. Edge / błędy

- Produkt draft / brak plików → niewidoczny w storefroncie / „Kup" disabled gdy brak `downloadFiles`.
- Token: malformed → 403 natychmiast (HMAC fail, bez DB); expired/limit → strona z komunikatem (nie goły JSON, gdy wejście przez przeglądarkę na `/download/<token>`; API route zwraca JSON 403).
- Webhook bez `productId` i bez `programId` → zapis eventu, brak fulfillmentu (jak dziś).
- Checkout dla draftu/nieistniejącego produktu → 404.
- Brevo down → grant istnieje, log error, event processed (wzorzec kursowy).

## 9. Poza zakresem (v1)

- Konta użytkowników / historia zamówień na apps.\* (celowo BEZ konta).
- Faktury/paragony (Stripe wysyła własne potwierdzenie).
- Kody rabatowe, koszyk wieloproduktowy (Checkout = 1 produkt).
- EN (PL-only v1, jak courses).
- Re-send linku self-service (admin może ręcznie; v2: formularz „wyślij ponownie").

## 10. Testowanie

- **TDD (vitest)**: `downloadToken` sign/verify (happy, malformed, zły secret, timing-safe), logika walidacji grantu (expiry/uses), gałąź webhooka `productId` (grant + idempotencja po `stripeSessionId`), checkout line-item builder (`stripePriceId` vs `price_data`).
- **Build + smoke** (host `apps.devince.dev` przez curl z Host headerem na dev-serverze): storefront 200 + lista fixture, produkt 200, `/api/apps/download/<bad>` → 403, ważny token → 200 + bajty pliku + Content-Disposition, `/download/<token>` strona 200, izolacja: główna devince.dev i courses.* bez zmian.
- **Fixture**: skrypt/seed `scripts/seed-app-fixture.ts` — produkt testowy + asset + (na potrzeby smoke) grant z ważnym tokenem.

## 11. Workstreamy i zależności

- **A1 — Model + migracja**: Products / AppAssets / DownloadGrants → `migrate:create apps_store_model` → generate:types.
- **A2 — Token util (TDD)**: `downloadToken.ts` sign/verify. (niezależny)
- **A3 — Subdomena + theme**: middleware `apps.*`, `apps-app/` layout + `app-theme.css`. (niezależny od A1/A2)
- **A4 — Checkout route + webhook branch**: `POST /api/apps/checkout`, rozszerzenie webhooka (grant + Brevo `sendDownloadLinkEmail`). (zależy A1+A2)
- **A5 — Download route + strona**: `GET /api/apps/download/[token]`, `/download/[token]` page. (zależy A1+A2+A3)
- **A6 — Storefront + produkt + success**: strony. (zależy A1+A3)
- **A7 — Fixture + smoke E2E + PR**: seed, pełny smoke, runbook deploya w PR. (zależy wszystkie)
- Kolejność: A1/A2/A3 równolegle → A4/A5/A6 → A7.
