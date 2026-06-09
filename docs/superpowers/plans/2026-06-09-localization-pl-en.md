# Pełna lokalizacja PL/EN (PL default) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strona devince.dev ma PL jako domyślny język serwowany bez prefiksu, EN pod `/en`, i wszystko realnie przetłumaczone — zero angielskiego na trasach PL.

**Architecture:** Zwijamy zduplikowane drzewa tras (`(frontend)/*` + `(frontend)/en/*`) do jednego segmentu `(frontend)/[locale]/*`; middleware robi `rewrite` dla locale domyślnego (PL bez prefiksu w URL) i `redirect` `/pl/*`→`/*`. Rozszerzamy istniejący słownik `src/i18n/` i podpinamy każdy zahardkodowany komponent; lokalizujemy brakujące pola Payload; daty/SEO stają się locale-aware.

**Tech Stack:** Next.js 15 App Router, Payload 3.67 localization (`pl`/`en`, default `pl`, `fallback: true`), istniejący lekki słownik `src/i18n` + `LocaleProvider`, vitest (nowy harness), Playwright (smoke).

**Spec:** `docs/superpowers/specs/2026-06-09-localization-pl-en-design.md`

**Uwaga o zależności:** `src/middleware.ts` jest współdzielony z planem platformy kursowej. **Task A1 (rewrite `[locale]`) musi wylądować przed** dokładaniem host-checka subdomeny w planie B (B0).

---

### Task A0: Minimalny harness testowy (vitest)

Repo ma skrypty `test:int`/`test:e2e`, ale brak configów i testów. Tworzymy minimalny vitest pod testy czystej logiki (i18n, helpery).

**Files:**
- Create: `vitest.config.mts`
- Create: `src/i18n/translations.test.ts`

- [ ] **Step 1: Utwórz config vitest**

```ts
// vitest.config.mts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 2: Napisz failing test kompletności słownika**

```ts
// src/i18n/translations.test.ts
import { describe, it, expect } from 'vitest'
import { translationsForTest as translations } from './translations'

describe('i18n dictionary', () => {
  it('has identical key sets for pl and en', () => {
    const plKeys = Object.keys(translations.pl).sort()
    const enKeys = Object.keys(translations.en).sort()
    expect(enKeys).toEqual(plKeys)
  })
})
```

- [ ] **Step 3: Wyeksportuj słownik do testu**

W `src/i18n/translations.ts` dodaj na końcu: `export const translationsForTest = translations`.

- [ ] **Step 4: Uruchom test**

Run: `pnpm test:int`
Expected: PASS (obecny słownik ma równe klucze pl/en).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.mts src/i18n/translations.test.ts src/i18n/translations.ts
git commit -m "test: add vitest harness + i18n dictionary parity test"
```

---

### Task A1: Refaktor routingu do segmentu `[locale]` + middleware rewrite

**Files:**
- Modify: `src/middleware.ts`
- Move: cała zawartość `src/app/(frontend)/` (poza `api`, `(sitemaps)`, `next`, `globals.css`, `theme.css`) → `src/app/(frontend)/[locale]/`
- Delete: `src/app/(frontend)/en/`
- Modify: `src/app/(frontend)/[locale]/layout.tsx` (locale z params)
- Modify: każda przeniesiona `page.tsx`/`generateMetadata` (dodanie `locale` z params)

- [ ] **Step 1: Przenieś trasy pod `[locale]` (git mv)**

```bash
cd src/app/\(frontend\)
mkdir -p \[locale\]
git mv layout.tsx page.tsx not-found.tsx \[slug\] posts projects program courses events workshops contact search newsletter \[locale\]/
git rm -r en
```
Zostają poza `[locale]`: `api/`, `(sitemaps)/`, `next/`, `globals.css`, `theme.css`.

- [ ] **Step 2: Przepisz middleware na rewrite-dla-default**

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale, isValidLocale } from './i18n/config'

const PUBLIC_FILE = /\.(.*)$/
const EXCLUDED_PREFIXES = ['/admin', '/api', '/_next', '/next', '/favicon', '/robots.txt', '/sitemap']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p)) || PUBLIC_FILE.test(pathname)) {
    return NextResponse.next()
  }

  const seg = pathname.split('/')[1] ?? ''

  // /pl/... -> redirect do kanonicznej ścieżki bez prefiksu
  if (seg === defaultLocale) {
    const stripped = pathname.replace(`/${defaultLocale}`, '') || '/'
    return NextResponse.redirect(new URL(stripped, request.url))
  }

  // /en/... -> pass-through do [locale]=en
  if (isValidLocale(seg)) {
    const res = NextResponse.next()
    res.headers.set('x-locale', seg)
    res.headers.set('x-pathname', pathname)
    return res
  }

  // brak prefiksu -> locale domyślny: rewrite do /[defaultLocale]/..., URL bez zmian
  const url = request.nextUrl.clone()
  url.pathname = `/${defaultLocale}${pathname}`
  const res = NextResponse.rewrite(url)
  res.headers.set('x-locale', defaultLocale)
  res.headers.set('x-pathname', pathname)
  return res
}

export const config = {
  matcher: ['/((?!_next|admin|api|favicon|robots.txt|sitemap).*)'],
}
```
Uwaga: `locales` zaimportowane bo `isValidLocale` go używa; jeśli lint zgłosi unused, użyj tylko `defaultLocale, isValidLocale`.

- [ ] **Step 3: Zaktualizuj `[locale]/layout.tsx` na locale z params**

Sygnatura: `export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> })`. Wewnątrz: `const { locale } = await params; const lang = getLocaleFromParams(locale)`. Ustaw `<html lang={lang}>` i przekaż `lang` do `LocaleProvider`. Import `getLocaleFromParams` z `@/utilities/getLocale`.

- [ ] **Step 4: Zaktualizuj każdą stronę na `params.locale`**

Wzorzec dla KAŻDEJ przeniesionej strony (`page.tsx` i `generateMetadata`): zmień typ params z `Promise<{ slug?: string }>` na `Promise<{ locale: string; slug?: string }>`, na początku `const { locale: localeParam, slug = '' } = await paramsPromise; const locale = getLocaleFromParams(localeParam)`, przekaż `locale` do zapytań `payload.find({ locale })` i do `t(locale, ...)`. Pliki do zmiany: `[locale]/page.tsx`, `[locale]/[slug]/page.tsx`, `[locale]/posts/page.tsx`, `[locale]/posts/[slug]/page.tsx`, `[locale]/posts/page/[pageNumber]/page.tsx` (jeśli jest), `[locale]/projects/page.tsx`, `[locale]/projects/[slug]/page.tsx`, `[locale]/program/[slug]/page.tsx`, `[locale]/courses/page.tsx`, `[locale]/events/page.tsx`, `[locale]/workshops/page.tsx`, `[locale]/contact/page.tsx`, `[locale]/search/page.tsx`, `[locale]/newsletter/confirmed/page.tsx`, `[locale]/not-found.tsx`. (W `program/[slug]/page.tsx` zastąp `const locale = await getLocale()` linią z params.)

- [ ] **Step 5: Audyt linków → `getLocalizedPath`**

W komponentach budujących `href` (`src/Header/**`, `src/Footer/**`, `src/components/Card`, `ProjectCard`, `ProgramCard`, `LanguageSwitcher`, `Pagination`, `PageRange`) zamień surowe `href={'/posts'}` na `href={getLocalizedPath('/posts', locale)}`. Komponenty serwerowe biorą `locale` z propsów (przekaż z page); klienckie z `useTranslation().locale`/`LocaleProvider`.

- [ ] **Step 6: Weryfikacja build + lint**

Run: `pnpm generate:types && pnpm lint && pnpm build`
Expected: build przechodzi; brak błędów typów params.

- [ ] **Step 7: Smoke obu locale (dev)**

Uruchom `pnpm dev` (port 3010). Sprawdź `curl -sI localhost:3010/` (200, renderuje PL), `/en` (200, EN), `/pl/` (308/307 redirect→`/`), `/projects`, `/en/projects`, `/program/<slug>`, `/en/program/<slug>` — żaden nie 404 z powodu locale.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(i18n): collapse routes to [locale] segment with default-locale rewrite"
```

---

### Task A2: Słownik UI — dosypanie kluczy i podpięcie komponentów

**Files:**
- Modify: `src/i18n/translations.ts`
- Modify: komponenty z inwentarza (lista w spec §A2)
- Modify: `src/i18n/translations.test.ts` (rozszerzenie asercji)

- [ ] **Step 1: Dodaj brakujące klucze do słownika (pl i en)**

W `translations.ts` dopisz w obu blokach (pl/en) klucze (wartości PL realne, EN realne):
```
'posts.title', 'projects.title', 'projects.description', 'projects.empty',
'search.heading', 'search.submit', 'search.noResults',
'pagination.previous', 'pagination.next', 'pagination.morePages', 'pagination.aria', 'pagination.prevAria', 'pagination.nextAria',
'pageRange.showing', // "Wyświetlam {from}-{to} z {total}" / "Showing {from}-{to} of {total}"
'pageRange.noResults',
'notFound.title', 'notFound.message', 'notFound.home',
'post.author', 'post.datePublished', 'post.untitledCategory',
'card.untitledCategory',
'project.liveSite', 'project.noImage',
'contact.notConfigured', 'contact.findUs', 'contact.mapPlaceholder', 'contact.followUs',
'header.search', 'header.openMenu', 'header.closeMenu', 'header.submitSearch',
'footer.subscribe',
'newsletter.successInline', 'newsletter.failed', 'newsletter.errorGeneric', 'newsletter.emailPlaceholder', 'newsletter.returnHome',
'program.type.course', 'program.type.workshop', 'program.type.event',
'program.label.date', 'program.label.duration', 'program.label.format', 'program.label.location', 'program.label.price', 'program.label.free', 'program.label.paid', 'program.noImage'
```
(Część już istnieje — nie duplikuj; np. `newsletter.subscribe`, `contact.email/phone/address`, `footer.navigation/contact`, `search.placeholder`.)

- [ ] **Step 2: Podepnij komponenty serwerowe**

Zamień hardkod na `t(locale, 'klucz')` w: `[locale]/posts/page.tsx`, `[locale]/projects/page.tsx`, `[locale]/search/page.tsx`, `[locale]/contact/page.tsx`, `[locale]/newsletter/confirmed/page.tsx`, `[locale]/not-found.tsx`, `src/heros/PostHero/index.tsx`, `src/components/PageRange/index.tsx`, `src/components/ContactInfo/index.tsx`. (`locale` przekaż z page do komponentów jako prop.)

- [ ] **Step 3: Podepnij komponenty klienckie**

`useTranslation()` w: `src/Header/Nav/index.tsx`, `src/components/NewsletterForm/index.tsx`, `src/search/Component.tsx`, `src/Footer/Component.tsx` (jeśli kliencki — inaczej prop). `src/components/Card/index.tsx`, `src/components/ProjectCard/index.tsx`, `src/components/ProjectHero/index.tsx`.

- [ ] **Step 4: Paginacja przez propsy**

W `src/components/Pagination/index.tsx` przekaż labelki (`previous`, `next`, `morePages`, aria) do shadcn `src/components/ui/pagination.tsx` jako propsy (usuń hardkod z `ui/pagination.tsx`).

- [ ] **Step 5: Rozszerz test parytetu**

Test z A0 już sprawdza parytet kluczy — po dodaniu kluczy uruchom go ponownie.
Run: `pnpm test:int`
Expected: PASS (pl/en mają identyczne zestawy kluczy).

- [ ] **Step 6: Weryfikacja**

Run: `pnpm lint && pnpm build`. Dev smoke: na `/posts`, `/projects`, `/contact`, `/search`, 404 — brak angielskich stringów; na `/en/...` angielskie.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "i18n: route all hardcoded UI strings through dictionary"
```

---

### Task A3: Lokalizacja brakujących pól Payload

**Files:**
- Modify: `src/collections/Posts/index.ts` (pole `content`)
- Modify: `src/Header/config.ts` (navItems `label`)
- Modify: `src/Footer/config.ts` (navItems `label`, `newsletterTitle`, `newsletterDescription`)

- [ ] **Step 1: Dodaj `localized: true`**

W `Posts.content` → `localized: true`. W `Header.navItems` polu `label` → `localized: true`. W `Footer.navItems.label`, `Footer.newsletterTitle`, `Footer.newsletterDescription` → `localized: true`.

- [ ] **Step 2: Regeneruj typy i schemat**

Run: `pnpm generate:types`
Expected: `payload-types.ts` zaktualizowany. (DB: `push: true` zmieni kolumny na localized przy starcie.)

- [ ] **Step 3: Weryfikacja**

Run: `pnpm build`. W adminie (`pnpm dev`) sprawdź, że pola pokazują przełącznik locale.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "i18n: localize Posts.content + Header/Footer nav labels & newsletter copy"
```

---

### Task A4: Daty / SEO / hreflang locale-aware

**Files:**
- Modify: `src/utilities/formatDateTime.ts`
- Test: `src/utilities/formatDateTime.test.ts`
- Modify: `src/heros/PostHero/index.tsx`, `src/components/ProgramCard/index.tsx`, `src/components/ProgramMeta/index.tsx`
- Modify: `src/utilities/generateMeta.ts`, `src/utilities/mergeOpenGraph.ts`, `src/app/(frontend)/[locale]/layout.tsx`

- [ ] **Step 1: Failing test formatDateTime(locale)**

```ts
// src/utilities/formatDateTime.test.ts
import { describe, it, expect } from 'vitest'
import { formatDateTime } from './formatDateTime'

describe('formatDateTime', () => {
  it('formats pl as DD.MM.YYYY', () => {
    expect(formatDateTime('2026-03-09T00:00:00.000Z', 'pl')).toBe('09.03.2026')
  })
  it('formats en as MM/DD/YYYY', () => {
    expect(formatDateTime('2026-03-09T00:00:00.000Z', 'en')).toMatch(/03\/09\/2026/)
  })
})
```

- [ ] **Step 2: Uruchom — ma failować**

Run: `pnpm test:int`
Expected: FAIL (obecna sygnatura bez locale).

- [ ] **Step 3: Zaimplementuj locale-aware**

```ts
// src/utilities/formatDateTime.ts
import type { Locale } from '@/i18n'

export const formatDateTime = (timestamp: string, locale: Locale = 'pl'): string => {
  const date = new Date(timestamp)
  if (locale === 'pl') {
    const d = String(date.getDate()).padStart(2, '0')
    const m = String(date.getMonth() + 1).padStart(2, '0')
    return `${d}.${m}.${date.getFullYear()}`
  }
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}/${d}/${date.getFullYear()}`
}
```

- [ ] **Step 4: Uruchom — ma przejść**

Run: `pnpm test:int`
Expected: PASS.

- [ ] **Step 5: Przekaż locale do użyć**

`PostHero` przekazuje `locale` do `formatDateTime`. `ProgramCard`/`ProgramMeta`: zastąp hardkod `toLocaleDateString('pl-PL', …)` na `formatDateTime(date, locale)` oraz etykiety (`Kurs/Course`, format, pricing, `Data`, `Czas trwania`, `Lokalizacja`, `Cena`, `Brak obrazu`) na `t(locale, 'program.*')`. `locale` z propsów strony.

- [ ] **Step 6: SEO/hreflang**

`generateMeta.ts`: przyjmij `locale`, sufiks tytułu i default description ze słownika; dodaj `alternates: { languages: { pl: getLocalizedPath(path,'pl'), en: getLocalizedPath(path,'en') } }`. `mergeOpenGraph.ts`: `locale` → `og:locale` (`pl_PL`/`en_US`), zlokalizowana default description, `siteName` z env. `layout.tsx`: usuń `twitter.creator: '@payloadcms'`.

- [ ] **Step 7: Weryfikacja**

Run: `pnpm lint && pnpm build`. Smoke: data na `/posts/<slug>` = `DD.MM.YYYY`; `<link rel="alternate" hreflang>` w HTML; `og:locale` poprawne.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "i18n: locale-aware dates + localized SEO/OG + hreflang alternates"
```

---

### Task A5: Naprawa seed (PL default + tłumaczenia EN)

**Files:**
- Modify: `src/endpoints/seed/index.ts`

- [ ] **Step 1: Przepisz About/Projects po polsku**

W seedzie strony „About" i „Projects" (ok. linie z `Combining technical depth…`, `Recent projects…`, feature titles `Hands-On Development`/`Modern Stack`/`Community Connected`) → polskie odpowiedniki w domyślnym slocie (`payload.update` bez `locale` = `pl`).

- [ ] **Step 2: Dosiej tłumaczenia EN**

Po utworzeniu dokumentów localized (Home, About, Projects, Program landing, posty) dodaj `payload.update({ collection, id, locale: 'en', data: { /* angielskie wartości pól localized */ } })`.

- [ ] **Step 3: Weryfikacja**

Uruchom seed (endpoint/skrypt jak w repo). Sprawdź w adminie: PL = polski, EN = angielski; na froncie `/` brak angielskiego, `/en` angielski.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "i18n: seed PL content in default locale + seed EN translations"
```

---

## Self-Review (autor planu)

- **Pokrycie spec:** A1↔§3.1/§A1, A2↔§A2, A3↔§A3, A4↔§A4, A5↔§A5, A0 (harness) dodany bo brak testów. Routing/fallback/preview z §5 obsłużone w A1 (middleware + `next` poza `[locale]`) i A4 (hreflang). ✔
- **Placeholdery:** kod podany dla middleware, formatDateTime, vitest; kroki mechaniczne (przenoszenie tras, dodawanie kluczy) mają komendy/wzorzec — to nie „TODO". ✔
- **Spójność typów:** `getLocaleFromParams`/`getLocalizedPath`/`t`/`Locale` istnieją w `src/i18n` + `src/utilities/getLocale.ts`; `formatDateTime(timestamp, locale)` użyte spójnie w PostHero/ProgramCard. ✔
- **Zależność:** A1 przed B0 (wspólny middleware) — odnotowane w nagłówku.
