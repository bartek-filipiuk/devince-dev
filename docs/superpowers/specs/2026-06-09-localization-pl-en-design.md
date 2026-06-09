# Spec: Pełna lokalizacja PL/EN (PL default) — devince.dev

> Status: zatwierdzony design (2026-06-09). Źródło: brainstorm + audyt i18n.
> Projekt **A** z pary A (lokalizacja) / B (platforma kursowa). Niezależny od B poza jednym wspólnym plikiem `src/middleware.ts` (patrz „Zależności").

## 1. Cel

Strona ma jasny podział PL/EN, **PL jako domyślny**, i **wszystko jest realnie przetłumaczone**. Dziś na wersji PL pojawia się angielski tekst z czterech niezależnych przyczyn:

1. ~30 zahardkodowanych angielskich stringów w komponentach, które nie pytają o locale (słownik `src/i18n/` istnieje, ale prawie nieużywany).
2. Część pól Payload nie jest `localized` (treść posta, labelki nawigacji) → współdzielona wartość wycieka między locale.
3. Seed: strony „About"/„Projects" napisane po angielsku w domyślnym slocie `pl`.
4. Dziury w routingu: `projects`, `program/[slug]`, `courses`, `events`, `workshops` nie mają wariantu `/en` (404), a część jest hardkodowana po polsku bez wariantu EN.

Definicja ukończenia: na każdej trasie PL (root, bez prefiksu) nie ma angielskiego tekstu UI ani treści; każda trasa ma działający odpowiednik `/en`; brak tras 404 wynikających z braku wariantu locale; daty/SEO są locale-aware.

## 2. Stan obecny (zweryfikowany w kodzie)

- **Payload localization** (`src/payload.config.ts:25-38`): locales `pl`,`en`; `defaultLocale: 'pl'`; `fallback: true`. (Poprawne — zostaje.)
- **Routing**: `src/middleware.ts` ustawia nagłówek `x-locale`. Root (bez prefiksu) = pl; `/en/*` = en; `/pl/*` → redirect na bez-prefiksu. Drzewo tras zduplikowane: `src/app/(frontend)/*` (pl) + `src/app/(frontend)/en/*` (re-exporty).
- **Słownik**: `src/i18n/config.ts` (locales, `getLocalizedPath`, `removeLocaleFromPath`), `src/i18n/translations.ts` (~50 kluczy pl+en, funkcje `t`/`getTranslation`), `src/providers/Locale` (`useTranslation`), `src/utilities/getLocale.ts` (`getLocale` z headera, `getLocaleFromParams`).
- **Pola localized dziś**: tytuły kolekcji, `meta.*` (SEO plugin), Projects `description`, Program (`title`, `heroHeadline`, `heroDescription`, `locationName`, `locationAddress`, `duration`, `ctaLabel`), bloki BrevoSignup/FeaturedProjects.
- **Pola NIE-localized (wyciek angielskiego)**: `Posts.content` (treść artykułu), `Header.navItems.label`, `Footer.navItems.label` + `newsletterTitle`/`newsletterDescription`.

## 3. Architektura docelowa

### 3.1. Routing — zwinięcie do jednego segmentu `[locale]`

Całe drzewo `src/app/(frontend)/*` (poza `api`, `(sitemaps)`, `next`, statyki) przenosimy do `src/app/(frontend)/[locale]/`. Usuwamy katalog `src/app/(frontend)/en/`.

`src/middleware.ts` — rewrite (NIE redirect) dla locale domyślnego, żeby PL został bez prefiksu w URL:

| Żądanie | Akcja | URL w przeglądarce | Renderuje |
|---|---|---|---|
| `/o-mnie` (brak prefiksu) | `NextResponse.rewrite('/pl/o-mnie')` + header `x-locale=pl` | `/o-mnie` | `[locale]=pl` |
| `/en/o-mnie` | pass-through + header `x-locale=en` | `/en/o-mnie` | `[locale]=en` |
| `/pl/o-mnie` | `NextResponse.redirect('/o-mnie')` (kanonizacja) | `/o-mnie` | `[locale]=pl` |

Wyłączenia z rewrite (bez zmian co do logiki): `/_next`, `/admin`, `/api`, `/next`, `/favicon`, `/robots.txt`, `/sitemap*.xml`, `(sitemaps)`, pliki statyczne (`PUBLIC_FILE`).

### 3.2. Pobieranie locale w stronach

- Strony serwerowe czytają `params.locale` (przez `getLocaleFromParams`) i przekazują do `payload.find({ locale })` oraz do `t(locale, ...)`.
- `getLocale()` (header `x-locale`) zostaje jako fallback dla komponentów bez dostępu do params.
- Komponenty klienckie: `useTranslation()` z `LocaleProvider` (provider dostaje locale z `[locale]/layout.tsx`).
- Budowanie linków: wszystkie `Link`/`href` przez `getLocalizedPath(path, locale)` (pl bez prefiksu, en z `/en`). Wymaga audytu użyć `next/link` w komponentach nawigacyjnych (Header, Footer, Card, ProjectCard, ProgramCard, LanguageSwitcher, paginacja).

## 4. Workstreamy

### A1 — Refaktor routingu do `[locale]`
- Utwórz `src/app/(frontend)/[locale]/` i przenieś: `layout.tsx`, `page.tsx`, `not-found.tsx`, `[slug]/`, `posts/`, `projects/`, `program/`, `courses/`, `events/`, `workshops/`, `contact/`, `search/`, `newsletter/`.
- Usuń `src/app/(frontend)/en/`.
- Każda przeniesiona strona: dodaj `params.locale`, użyj `getLocaleFromParams`, przekazuj `locale` do zapytań i komponentów.
- `[locale]/layout.tsx`: przekaż locale do `LocaleProvider`; ustaw `<html lang={locale}>`.
- Przepisz `src/middleware.ts` na rewrite-dla-default wg tabeli 3.1.
- Audyt linków → `getLocalizedPath`.
- **Ryzyko/uwaga:** to największy refaktor; testować każdą trasę w obu locale (lista w §7). `generateStaticParams` niewymagane (strony `force-dynamic`).

### A2 — Słownik UI i podpięcie komponentów
Rozszerz `src/i18n/translations.ts` o brakujące klucze i podepnij komponenty. Pełny inwentarz stringów do przeniesienia na `t(locale, key)` / `useTranslation()`:

- **Footer** `src/Footer/Component.tsx`: `Navigation`(:40 — klucz `footer.navigation` już jest), `Contact`(:58), `Subscribe to our newsletter`(:67), `All rights reserved`(:84).
- **Header/Nav** `src/Header/Nav/index.tsx`: `Search`(:24,:33), `Close menu`/`Open menu`(:40).
- **Paginacja (shadcn)** `src/components/ui/pagination.tsx`: `Go to previous page`/`Previous`(:51,:57), `Go to next page`/`Next`(:63,:68), `More pages`(:81), aria `pagination`(:11) — labelki podajemy **przez propsy** z `src/components/Pagination/index.tsx`.
- **PageRange** `src/components/PageRange/index.tsx`: `Docs/Doc/Posts/Post`(:4-12), `Search produced no results.`(:49), szablon „Showing X-Y of N"(:52).
- **Search** `src/search/Component.tsx`: label/placeholder `Search`(:26,:33), `submit`(:36).
- **NewsletterForm** `src/components/NewsletterForm/index.tsx`: `Successfully subscribed!`(:33), `Subscription failed`(:36), `An error occurred…`(:40), placeholder `Enter your email`(:49), `Subscribing...`/`Subscribe`(:62) — część kluczy `newsletter.*` już istnieje.
- **Listing posts** `src/app/(frontend)/.../posts/page.tsx`: `<h1>Posts</h1>`(:38), meta `Devince Posts`(:64).
- **Listing projects** `.../projects/page.tsx`: `Projects`(:38), `A collection of my work…`(:40), `No projects found.`(:61), meta(:71-72).
- **Search page** `.../search/page.tsx`: `Search`(:70), `No results found.`(:81), meta `Devince Search`(:89).
- **Contact page** `.../contact/page.tsx`: cała strona hardkodowana EN (meta, `Contact Us`, `Get in Touch`, `Contact information not configured…`, `Find Us`, `Map or additional information…`, `Follow Us`) — część kluczy `contact.*` istnieje.
- **Newsletter confirmed** `.../newsletter/confirmed/page.tsx`: meta + `Subscription Confirmed!`, `Thank you for subscribing…`, `Return to Home` — klucze `newsletter.confirmed.*` istnieją.
- **404** `.../not-found.tsx`: `This page could not be found.`(:11), `Go home`(:14).
- **PostHero** `src/heros/PostHero/index.tsx`: `Untitled category`(:26), `Author`(:49), `Date Published`(:57).
- **Card** `src/components/Card/index.tsx`: `Untitled category`(:55).
- **ProjectCard** `src/components/ProjectCard/index.tsx`: `No image`(:37).
- **ProjectHero** `src/components/ProjectHero/index.tsx`: `Live Site`(:58).
- **ContactInfo** `src/components/ContactInfo/index.tsx`: `Email`(:58), `Phone`(:70), `Address`(:82) — klucze `contact.email/phone/address` istnieją.

Konwencja kluczy: rozszerzamy istniejący namespacing (`nav.*`, `common.*`, `footer.*`, `search.*`, `newsletter.*`, `contact.*`) o nowe: `posts.*`, `projects.*`, `pagination.*`, `notFound.*`, `post.*`, `card.*`, `project.*`, `pageRange.*`. Każdy nowy klucz dodany w **obu** locale.

### A3 — Lokalizacja brakujących pól Payload
- `localized: true` na: `Posts.content` (`src/collections/Posts/index.ts`), `Header.navItems.label` (`src/Header/config.ts`), `Footer.navItems.label` + `newsletterTitle`/`newsletterDescription` (`src/Footer/config.ts`).
- `pnpm generate:types` (schemat: `db push: true` zastosuje zmianę kolumn na localized).
- `SiteSettings`: `siteName`/`contact.*` zostają nie-localized (neutralne); jeśli teksty newslettera są w Footerze — patrz wyżej.

### A4 — Daty / SEO / hreflang
- `src/utilities/formatDateTime.ts`: przyjmij `locale`, użyj `Intl.DateTimeFormat(locale)` (PL → `DD.MM.YYYY`). Przekaż locale w `PostHero`.
- `ProgramCard`/`ProgramMeta`: daty + etykiety (`Kurs/Course`, format, pricing, `Data/Date`, `Czas trwania`, `Lokalizacja`, `Cena`, `Brak obrazu`) z `t(locale, ...)` zamiast hardkodu `pl-PL`.
- `src/utilities/generateMeta.ts` + `mergeOpenGraph.ts`: zlokalizowana default description, `og:locale` (`pl_PL`/`en_US`), fix sufiksu `| Devince`, usuń `creator: '@payloadcms'` (`layout.tsx:84-86`), dodaj `alternates.languages` (hreflang PL↔EN) w `generateMetadata`.
- `src/plugins/index.ts` `SITE_NAME`: fallback z env (zostaje), ale nie hardkoduj `'My Website'` jako widocznego tekstu.

### A5 — Seed
- `src/endpoints/seed/index.ts`: przepisz strony „About"/„Projects" po polsku (slot domyślny `pl`).
- Dla pól localized dosiej tłumaczenia `en` przez `payload.update({ ..., locale: 'en' })` (Home, About, Projects, Program landing, posty).

## 5. Obsługa błędów / przypadki brzegowe

- **404 cross-locale**: `[locale]/not-found.tsx` renderuje komunikat w aktualnym locale; nieznane locale (np. `/de/...`) → middleware traktuje jak brak prefiksu → rewrite na `pl`.
- **Fallback Payload (`fallback: true`)**: zostaje, ale po A5 nie ma już angielszczyzny w slocie `pl`, więc fallback EN→PL nie pokazuje przypadkowego angielskiego na PL.
- **Draft preview**: `generatePreviewPath`/`/next/preview` muszą zachować locale (przekazać `?locale=`); trasa `/next` pozostaje poza `[locale]`.
- **LanguageSwitcher**: przełącza prefiks zachowując bieżącą ścieżkę (użyj `removeLocaleFromPath` + `getLocalizedPath`).

## 6. Granice / poza zakresem

- Nie dodajemy trzeciego języka ani biblioteki i18n (next-intl) — rozszerzamy istniejący lekki słownik.
- Treść bloga (`Posts.content`) staje się localized, ale **dosianie realnych tłumaczeń EN istniejących postów** to zadanie redakcyjne (poza tym specem); kod ma jedynie umożliwić.
- SiteSettings `contact`/`socialLinks` zostają neutralne.

## 7. Testowanie (manualne + smoke)

Dla każdej trasy sprawdź PL (root) i EN (`/en/...`): `/`, `/[slug]` (np. about), `/posts`, `/posts/[slug]`, `/projects`, `/projects/[slug]`, `/program/[slug]`, `/courses`, `/events`, `/workshops`, `/contact`, `/search`, `/newsletter/confirmed`, 404. Kryteria: brak angielskiego na PL; każda trasa ma wariant EN (brak 404); daty w formacie locale; `<html lang>` i `hreflang` poprawne; LanguageSwitcher zachowuje ścieżkę. Playwright smoke na kluczowych trasach (skill `playwright-skill`).

## 8. Zależności

- **Wspólny plik z Projektem B: `src/middleware.ts`.** Kolejność: **A1 (rewrite `[locale]`) ląduje pierwsze**, potem B0 (host-check `courses.devince.dev`) dokładany na wierzch. Reszta A jest niezależna od B.
- Wewnątrz A: A1 jest fundamentem; A2/A3/A4/A5 można robić równolegle po A1 (A3 wymaga `generate:types` przed A4 dot. ProgramCard typów).
