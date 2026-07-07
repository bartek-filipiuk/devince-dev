# Design system devince.dev — kodyfikacja stanu faktycznego (PROPOZYCJA)

> Status: **propozycja do review** (nocny przebieg fable-hardening, task D9).
> To NIE jest nowy brand — to spis tego, co realnie siedzi w kodzie, z odwołaniem
> do pliku źródłowego przy każdym tokenie. Trzy twarze platformy = trzy odrębne,
> celowo izolowane systemy wizualne (każdy theme importowany wyłącznie przez
> layout swojej twarzy):
>
> | Twarz | Theme | Koncept |
> |---|---|---|
> | devince.dev (marketing) | `src/app/(frontend)/theme.css` | „Precision Tech" — light+dark, indigo |
> | courses.devince.dev | `src/app/courses-app/course-theme.css` | „Cyber Gold" — dark-first glassmorphism, złoto |
> | apps.devince.dev | `src/app/apps-app/app-theme.css` | wariant Sylabus — dark-first, niebieski oklch |
>
> Spec projektowy, z którego wynika theme.css: `PAGE_DESIGN.md` (koncept,
> inspiracje: Anthropic / Linear / Vercel / Stripe). Nie duplikować — tu tylko tokeny.

## Tokeny

### Marketing (`src/app/(frontend)/theme.css`, sekcje 1–2)

Format HSL bez `hsl()` (konsumowane przez Tailwind `hsl(var(--…))`). Light w
`:root`, dark w `[data-theme='dark']`.

| Token | Light | Dark | Rola |
|---|---|---|---|
| `--primary` | `220 70% 50%` (indigo) | `220 65% 60%` (jaśniejszy) | CTA, linki, akcenty — JEDYNY kolor „głośny" |
| `--accent` | `215 85% 55%` | `215 80% 65%` | elektryczny błękit, highlighty |
| `--secondary` | `210 12% 90%` | `220 15% 20%` | chłodny slate, tła drugorzędne |
| `--background` / `--foreground` | `210 15% 96%` / `210 20% 15%` | `220 20% 10%` / `210 15% 95%` | dark ≠ czysta czerń (blue-gray) |
| `--card` | `210 15% 98%` | `220 18% 14%` | karty bez borderów, cień zamiast ramki |
| `--muted-foreground` | `210 12% 45%` | `210 12% 60%` | tekst drugorzędny |
| `--border` / `--input` / `--ring` | `210 15% 88%` / j.w. / `= primary` | `220 15% 22%` / j.w. / `= primary` | focus ring dziedziczy primary |
| `--success` / `--warning` / `--error`+`--destructive` | `142 70% 45%` / `38 92% 50%` / `0 72% 51%` | wersje +5% L | semantyka stanów |
| `--section-alt` | `210 12% 94%` | `220 22% 8%` | naprzemienne tła sekcji |

Cienie: klasy `.shadow-subtle` / `.shadow-card` / `.shadow-card-hover`
(sekcja 4 theme.css) — jedyny dopuszczalny sposób „podnoszenia" kart;
w dark mode mają własne, mocniejsze warianty.

### Courses (`src/app/courses-app/course-theme.css`)

Dark-first, glassmorphism: powierzchnie to white-alpha nad gradientem tła.

- Baza: `--bg: #05050A`, gradienty `--bg-grad-a/b`; szkło: `--surface-1/2/3`
  (`rgba(255,255,255, .035/.06/.09)`), linie `--line`, `--line-soft`.
- Akcent: **złoto** `--accent: #E5B55C` + `--accent-soft/-line` (alpha),
  glow `--glow-gold`; tekst na akcencie `--on-accent: #05050A`.
- Semantyka lekcji: `--gate: #F59E0B` (płatna bramka), `--hybrid`/`--done:
  #10B981`, `--decision: #A78BFA` — każdy z parą `-soft`.
- Tekst: `--text: #F8FAFC`, `--text-mut: #94A3B8`, `--text-dim: #64748B`.

### Apps (`src/app/apps-app/app-theme.css`)

Te same NAZWY klas i tokenów co course-theme (wspólny język wizualny, zero
renaming churn — patrz nagłówek pliku), ale wartości w **oklch** i akcent
niebieski: `--accent: oklch(0.745 0.135 258)`. Promienie: `--r-card: 6px`,
`--r-chip: 3px`, `--r-btn: 6px`. Przyciski: `.btn--primary` = akcent + `--on-accent`.

Reguła nadrzędna: **kolor tylko przez token** — żaden komponent nie hardcoduje
hexów; zmiana identity = edycja theme.css danej twarzy (CLAUDE.md → Architektura).

## Typografia

### Marketing (`theme.css` sekcja 3 + `PAGE_DESIGN.md → TYPOGRAPHY`)

- `--font-heading: 'JetBrains Mono'` (mono w nagłówkach = decyzja brandowa
  „tech"), `--font-body: 'IBM Plex Sans'`; import Google Fonts w theme.css
  (wagi: Sans 400/500/600, Mono 500/600/700).
- Body: `1.0625rem`, `line-height: 1.7`. Nagłówki: letter-spacing `-0.01em`
  (h1: `-0.02em`). Caption (spec): 12px, uppercase, tracking `0.05em`.
- Nawigacja: `.nav-link` w mono, weight 500, tracking `0.1em` (sekcja 10).
- `code`/`pre`/`.font-mono` → font nagłówkowy (liczby i kod zawsze mono).

### Courses/Apps (`course-theme.css` / `app-theme.css`, nagłówki plików)

- `--font-ui`: systemowy stack (bez CDN), `--font-mono`: ui-monospace stack.
  Fallbacki na `html` (specyficzność 0,0,1), żeby zmienne z `next/font`
  zawsze wygrywały — nie „upraszczać" tego selektora.

## Spacing i layout

- Skala odstępów = Tailwind (config: `tailwind.config.mjs`); sekcje wg
  `PAGE_DESIGN.md → COMPONENT STYLING` (hero full-viewport `min-height: 100vh`,
  sekcje naprzemienne przez `--section-alt`).
- Ostre rogi na marketingu: border-radius **0px** (nagłówek theme.css —
  „Sharp corners"); na apps/courses drobne promienie przez tokeny `--r-*`.
- Animacje: `fade-in-up` 600ms + `.stagger-1..6` (skok 100ms) i `.scroll-reveal`
  (IntersectionObserver) — theme.css sekcja 5. KAŻDA animacja ma wyłącznik
  `prefers-reduced-motion` (sekcja 5, koniec) — nowe animacje też muszą go mieć.
- Focus states: sekcja 12 theme.css (a11y) — ring w kolorze `--ring`.
- Tło hero: geometryczna siatka 60×60px z `--primary` na 15% alpha + maska
  radialna (sekcja 6) — dekoracja generowana CSS-em, nie obrazkiem.

## Komponenty

- Strony marketingowe składane z bloków: schema `src/blocks/<Name>/config.ts` +
  render `src/blocks/<Name>/Component.tsx`, montaż `src/blocks/RenderBlocks.tsx`.
  Komponent bloku jest STRUKTURALNY — cała identyczność wizualna w klasach
  semantycznych theme.css (per-blok sekcje: 6 hero, 7 features, 8 testimonials,
  9 contact-CTA, 15 featured-projects, 19–21 program, 22 brevo-signup).
- Nowy blok = config + Component + rejestracja w `src/collections/Pages/index.ts`
  i `RenderBlocks.tsx` + własna sekcja klas w theme.css (playbook w CLAUDE.md).
- Karty: bez borderów, `.shadow-card` → `.shadow-card-hover` na hover.
- Przyciski (apps/courses): warianty `.btn--primary` (akcent) itd. w
  `app-theme.css` — nie tworzyć równoległych stylów przycisków.
- Stany krytyczne UX: `BuyButton` (`src/app/apps-app/_components/BuyButton.tsx`)
  = wzorzec: disabled do momentu zgody (art. 38 pkt 13), stan `busy`,
  komunikat błędu z proponowanym wyjściem; wszystkie etykiety przychodzą
  z serwera jako propsy (lokalizacja PL/EN po stronie strony, nie komponentu).

## Microcopy

- Głos: konkretny, techniczny, bez wykrzykników; PL domyślne, EN drugi locale
  (`src/i18n/config.ts`); daty/liczby formatowane per locale (`pl-PL`/`en-US`,
  np. w `src/app/apps-app/[slug]/page.tsx`).
- Przycisk mówi, co robi — wzorce z kodu: „Zapisz" (BrevoSignup
  `src/blocks/BrevoSignup/Component.tsx`), etykiety Buy/Processing/Error
  przekazywane do `BuyButton` per locale. Anty-wzorzec: „OK", „Kliknij tutaj".
- Komunikat błędu daje następny krok (BuyButton: `errorLabel` po nieudanym
  checkoucie zamiast surowego wyjątku); NIGDY nie przeciekamy stanu
  bezpieczeństwa: route'y wrażliwe zwracają jednolite `forbidden` 403 bez
  rozróżniania invalid/expired (model: `api/apps/download/[token]/route.ts`).
- API zewnętrzne: błędy ustrukturyzowane `{ error: { code, message } }`
  (`api/external/_lib/errors.ts`) — kody z zamkniętej listy, message pełnym
  zdaniem z instrukcją („type is required and must be one of: …").
- Zgody prawne: checkbox niezaznaczony domyślnie, tekst zgody osobny od
  newslettera; serwer jest bramką prawną, checkbox tylko UX (BuyButton +
  `api/apps/checkout/route.ts`).

---

Decyzje do porannego review: (1) czy mono-nagłówki zostają kanonem także dla
przyszłych bloków marketingu; (2) czy apps i courses mają docelowo zejść do
jednego pliku theme z dwoma zestawami tokenów (dziś: celowa duplikacja nazw
klas); (3) czy skala typograficzna marketingu (body 17px / lh 1.7) ma wejść
do tokenów zamiast literałów w theme.css.
