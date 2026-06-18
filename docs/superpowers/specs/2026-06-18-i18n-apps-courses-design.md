# Spec: i18n PL/EN dla apps.devince.dev i courses.devince.dev

> Status: design zatwierdzony (2026-06-18). Sklepy są LIVE i sprzedają — **zero regresji PL** jest twardym wymogiem.

## 1. Cel
Apps i courses (obecnie PL-only, izolowane segmenty `src/app/apps-app` i `src/app/courses-app`) mają być **pełni dwujęzyczne PL/EN**: angielskie UI **oraz** localized treść (opisy/sylabus). Główna `devince.dev` już jest dwujęzyczna; reużywamy jej infrastrukturę.

## 2. Decyzje (z brainstormu)
| Decyzja | Wybór |
|---|---|
| Zakres | **Pełne**: UI (słownik) + localized treść (migracja pól) |
| Routing | **URL `/en/`** (jak główna), PL bez prefiksu (kanonicznie) |
| Mechanizm locale | **nagłówek `x-locale`** ustawiany przez middleware → strony czytają `getLocale()`. **Bez restrukturyzacji tras** na segment `[locale]` (mniejsze ryzyko dla żywych sklepów) |
| Default | `pl` |

## 3. Reużywana infrastruktura (istnieje)
- `src/i18n/` — `locales=['pl','en']`, `defaultLocale='pl'`, słownik `translations` (pl+en), `t(locale, key, params)`.
- `src/utilities/getLocale.server.ts` — `getLocale()` czyta `x-locale` (fallback `x-pathname`).
- `src/utilities/getLocale.ts` — `getLocalizedPath(path, locale)` (prefiks `/en` dla nie-default), `removeLocaleFromPath`, `getLocaleFromParams`.
- Wzorzec: `src/app/(frontend)/layout.tsx` używa `await getLocale()` → `lang`.

## 4. Architektura

### 4.1 Middleware (`src/middleware.ts`) — host-aware locale dla apps/courses
W blokach `isApps`/`isCourses` (host-rewrite do `/apps-app`/`/courses-app`):
1. Wyznacz `seg = pathname.split('/')[1]`.
2. Jeśli `seg === 'pl'` → **redirect** na ścieżkę bez `/pl` (kanoniczne PL).
3. Jeśli `seg === 'en'` → locale `en`, „goła" ścieżka = `pathname` bez `/en`.
4. Inaczej → locale `pl`, goła ścieżka = `pathname`.
5. `rewrite` do `/<segment-app>${gołaŚcieżka}` (jak dziś) **+** `res.headers.set('x-locale', locale)` i `x-pathname`.
- Już-przepisane `/apps-app`/`/courses-app` (direct) i shared infra (`/api`,`/_next`,statyki) — bez zmian.
- `COURSE_PAGE_PREFIXES` (login/account/learn) na courses-host: zachować, z tym samym ustawieniem `x-locale`.

### 4.2 Strony i layouty — czytają locale, renderują dwujęzycznie
- `apps-app/layout.tsx` i `courses-app/layout.tsx`: `const locale = await getLocale()` → `<html lang={locale}>`; przekazać `locale` do Nav/Footer; theme-init bez zmian.
- Każda strona (`force-dynamic`, już są): `const locale = await getLocale()`; `payload.find/findByID({ ..., locale })` dla localized treści; teksty UI przez `t(locale, key)`.
- Linki wewnętrzne (storefront→produkt, pager, „Zacznij") budować przez `getLocalizedPath(path, locale)` — przy `en` zachowują prefiks `/en`.
- Akcje klienta (np. `BuyButton` POST `/api/apps/checkout`) — bez zmian (relatywne, shared `/api`). Po zakupie URL-e (`success_url`/`cancel_url`) zostają na domyślnym — OK (mail/treść transakcji osobno).

### 4.3 Słownik UI
Dodać do `src/i18n/translations.ts` (pl+en) klucze dla apps/courses, m.in.:
- apps: `apps.nav.brand`, `apps.store.eyebrow`, `apps.store.empty`, `apps.product.buy`, `apps.product.note`, `apps.buy.processing`, `apps.buy.error`, `apps.success.title/body`, `apps.download.invalid/expired/limit/remaining/file`, `apps.notFound.*`.
- courses: `courses.nav.brand`, `courses.store.*`, `courses.syllabus.*` (eyebrow/meta/outcomes/curriculum/badges gate/hybrid/decision/cta), `courses.lesson.*` (why/what/dod/deps/prev/next), `courses.auth.*`, `courses.notFound.*`.
- Pełne pokrycie istniejących twardych stringów PL w obu segmentach (audyt grep podczas implementacji). Test słownika: każdy klucz ma pl i en.

### 4.4 Localized treść (migracja)
`localized: true` na polach **treściowych** (NIE strukturalnych/cenowych):
- `Products`: `title`, `description`. (`priceCents`/`currency`/`slug`/`stripePriceId`/`downloadFiles`/`coverImage` — locale-neutral; SEO meta już localized.)
- `Lessons`: `title`, `why`, `what`, `dod`, `content`. (`nr`/`phaseId`/`hardGate`/`hybrid`/`kind`/`estTimeMin`/`slug`/`type`/`downloadFile` — neutralne.)
- `Program` (tab Sylabus): `phases.name`, `phases.hint`, `outcomes.title`, `outcomes.body`, `audience.item`, `requirements.item`. (`phases.letter`, `level` — neutralne.)
- `pnpm generate:types`; migracja przez `payload migrate:create i18n_localized_content` na `payload_ref`.
- **Zachowanie danych (krytyczne):** zmiana pola na localized przenosi kolumnę do `*_locales`. Migracja `up()` MUSI **skopiować istniejące wartości do locale `pl`** (inaczej utrata treści). Prod ma **1 produkt** (title/description) i **0 kursów** → wolumen mały, ale `up()` jawnie kopiuje stare wartości do wiersza `pl`. Zweryfikować na `prod_sim` z realnym dumpem prod.

### 4.5 Switcher języka
Mały komponent w Nav apps/courses (PL/EN). Linkuje do `getLocalizedPath(currentPath, targetLocale)` (potrzebny aktualny pathname — z `x-pathname` lub przekazany). Wzorować na switcherze głównej strony (full-nav, bez FOUC).

## 5. Strony objęte
- **apps-app**: storefront (`page.tsx`), produkt (`[slug]/page.tsx`), `success`, `download/[token]`, `not-found`.
- **courses-app**: storefront, sylabus (`[slug]`), lekcja (`[slug]/learn/[lesson]`), `login`/`account`, `not-found`.

## 6. Zero regresji PL — strategia
- PL = default, **URL bez prefiksu niezmieniony** → istniejące linki/SEO bez zmian.
- Lokalnie: dev server, smoke **PL i EN** dla apps+courses + **główna devince.dev bez zmian** (regресsja-check).
- Migracja: `migrate` na `payload_ref` + **`prod_sim` z realnym dumpem** (sprawdzić, że treść produktu zachowana jako `pl`), dopiero potem prod. Fail-fast chroni boot.
- e2e: Playwright/curl — PL i EN: storefront 200 + właściwy język UI, produkt/sylabus, switcher przełącza, zakup apps (`4242`) nadal działa, izolacja (główna + drugi host bez zmian).

## 7. Poza zakresem (v1)
- Tłumaczenie treści maili transakcyjnych per-locale (osobny krok; teraz PL fallback).
- Localized `slug` (slug pozostaje neutralny — wspólny dla pl/en).
- Auto-detekcja języka z `Accept-Language` (default pl; user przełącza ręcznie).
- i18n innych hostów.

## 8. Etapy (do planu, z testem PL/EN po każdym)
1. **Słownik** — klucze apps/courses (pl+en) + test pokrycia. (bez ryzyka)
2. **Middleware + odczyt locale** — host-aware `x-locale`, layouty/strony `getLocale()`, linki `getLocalizedPath`. Smoke PL/EN (UI strings).
3. **Migracja localized** — pola treściowe + zachowanie danych; `payload_ref` + `prod_sim`. Strony fetchują z `locale`.
4. **Switcher** w nav apps/courses.
5. **Finalne e2e** PL/EN + regresja główna + zakup apps.
