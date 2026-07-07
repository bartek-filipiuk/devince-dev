# Fable hardening — devince.dev (W1 security-regression + W2 bramki + W4 design tokens)

Plan pod nocny przebieg `/night-loop`. Autor: Fable 5, 2026-07-06.
Ścieżki przepływów i konwencje: `CLAUDE.md → ## Mapa terenu` (zweryfikowane 2026-07-06).

## Global Constraints

- Obowiązuje protokół skilla `howtoprojects` + workflow `references/existing-projects.md` (krok 0: mapa terenu, krok 2: naśladuj sąsiedztwo).
- Nowe testy TYLKO w `src/security/*.test.ts` (vitest include: `src/**/*.test.ts`, env node) — wyjątek: D4 rozszerza istniejący `src/access/enrolledOrAdmin.test.ts`.
- Mockowanie: naśladuj istniejące testy int (43 pliki zielone) — sprawdź, jak mockują Payload/db, zanim napiszesz pierwszy mock. Zero sieci, zero prawdziwego Stripe/db w gate'ach.
- `tsc --noEmit` ma 21 ZNANYCH błędów w mockach testowych (patrz Pułapki w mapie) — NIE naprawiaj ich w tym przebiegu i NIE dodawaj tsc do żadnego gate'a.
- Zakaz zmiany komend `verify`/gate'ów i osłabiania asercji — gate to źródło prawdy; naprawiaj kod/test, nie bramkę.
- Testy piszą się jako ATAK: każdy przypadek negatywny musi realnie wymuszać odmowę (asercja na status/brak side-effectu), nie tylko "nie rzuca".
- Nic z tego planu nie deployuje, nie migruje, nie dotyka `.env` — operacje na infrze wyłącznie w checkliście porannej.

---

### Task D0: Harness — smoke test pakietu security

**Files:**
- Create: `src/security/smoke.test.ts`

**Podejście:** Minimalny test (`expect(true).toBe(true)`) + import jednego modułu z `src/` przez alias tsconfig, żeby potwierdzić, że resolver działa w tym katalogu.

**Test:** `src/security/smoke.test.ts` — 1 przypadek.

**Gate:** `pnpm exec vitest run src/security/smoke.test.ts`

**deps:** []

### Task D1: Webhook Stripe — sygnatura przed parsowaniem

**Files:**
- Create: `src/security/stripe-webhook-signature.test.ts`
- Ref (nie modyfikuj bez potrzeby): route webhooka Stripe wg mapy (`api/stripe/webhook`, `constructEvent`, idempotencja `stripe-events`)

**Podejście:** Wywołaj handler route'u z (a) żądaniem bez nagłówka `stripe-signature`, (b) ze złą sygnaturą (mock `constructEvent` rzuca), (c) z poprawną (mock zwraca event). Asercje: (a,b) → status 4xx ORAZ fulfillment nie wywołany (spy), (c) → 2xx.

**Test:** 3 przypadki w `src/security/stripe-webhook-signature.test.ts`.

**Gate:** `pnpm exec vitest run src/security/stripe-webhook-signature.test.ts`

**deps:** [D0]

### Task D2: Webhook Stripe — idempotencja (replay)

**Files:**
- Create: `src/security/stripe-webhook-idempotency.test.ts`

**Podejście:** Ten sam `event.id` dostarczony dwukrotnie → fulfillment wykonany dokładnie raz (dedup przez kolekcję `stripe-events` wg mapy). Mock warstwy zapisu tak, by drugi przebieg trafił na istniejący wpis.

**Test:** 2 przypadki: pierwszy przebieg wykonuje, replay jest no-opem.

**Gate:** `pnpm exec vitest run src/security/stripe-webhook-idempotency.test.ts`

**deps:** [D0]

### Task D3: Token download — odmowy i path traversal

**Files:**
- Create: `src/security/download-token.test.ts`
- Ref: `api/apps/download/[token]` + streaming z `private-media-apps/` (mapa, przepływ apps store)

**Podejście:** (a) token nieistniejący → 4xx; (b) token wygasły lub grant innego usera → odmowa; (c) token spreparowany z `../` / zakodowanym traversal → odmowa, bez dotknięcia FS poza katalogiem (spy na warstwie odczytu pliku). Uwaga z mapy: regex `PUBLIC_FILE` w middleware celowo przepuszcza tokeny z kropką — to NIE jest kontrola dostępu; kontrola musi być w handlerze i to ją testujesz.

**Test:** ≥4 przypadki (w tym happy path z mockiem granta).

**Gate:** `pnpm exec vitest run src/security/download-token.test.ts`

**deps:** [D0]

### Task D4: Paywall kursów — domknięcie przypadków ataku

**Files:**
- Modify: `src/access/enrolledOrAdmin.test.ts`

**Podejście:** Przeczytaj istniejący test. Dopisz TYLKO brakujące przypadki z listy: brak zakupu → deny; zakup innego kursu → deny; user anonimowy → deny; cudzy `userId` w żądaniu nie daje dostępu (BOLA); admin → allow. Jeśli któryś już jest — nie duplikuj.

**Test:** komplet powyższych przypadków w istniejącym pliku.

**Gate:** `pnpm exec vitest run src/access/enrolledOrAdmin.test.ts`

**deps:** [D0]

### Task D5: External content API — autoryzacja Bearer

**Files:**
- Create: `src/security/external-api-auth.test.ts`
- Ref: `_lib/auth.ts` (timing-safe Bearer, mapa: przepływ external content API)

**Podejście:** Handler route'u `api/external/programs` (lub helper auth bezpośrednio): brak nagłówka → 401; zły token → 401; poprawny (z mockiem env) → przechodzi. Dodatkowo asercja, że porównanie idzie przez funkcję timing-safe (spy/import), nie `===`.

**Test:** ≥3 przypadki.

**Gate:** `pnpm exec vitest run src/security/external-api-auth.test.ts`

**deps:** [D0]

### Task D6: Checkout — cena z DB, nie z klienta

**Files:**
- Create: `src/security/checkout-amount.test.ts`
- Ref: `api/apps/checkout` (cena z tieru w DB) + `verifyAmount` w webhooku (mapa)

**Podejście:** (a) checkout ignoruje kwotę podaną przez klienta — sesja Stripe tworzona z ceną z DB (spy na payload do mocka Stripe); (b) `verifyAmount`: event z kwotą ≠ cenie z DB → fulfillment odrzucony.

**Test:** ≥2 przypadki.

**Gate:** `pnpm exec vitest run src/security/checkout-amount.test.ts`

**deps:** [D0]

### Task D7: scripts/lint-security.mjs — mechaniczne reguły

**Files:**
- Create: `scripts/lint-security.mjs`

**Podejście:** Node ≥18, zero zależności (fs + regex). Reguły (fail = wypisz plik+regułę, exit 1):
1. Każdy `route.ts` pod `src/app/**/api/external/` importuje z `_lib/auth` (lub wywołuje helper auth z tego modułu).
2. Plik route'u webhooka Stripe: wywołanie `constructEvent` występuje PRZED pierwszym użyciem sparsowanego body jako zaufanych danych (kolejność indeksów dopasowań w źródle).
3. Pliki z dyrektywą `"use client"` nie zawierają `process.env.` poza `NEXT_PUBLIC_`.
Tryb `--selftest`: wbudowane fixture'y (string w kodzie skryptu) — po jednym łamiącym każdą regułę i jednym czystym; selftest przechodzi, gdy łamiące są wykrywane, a czysty nie.

**Test:** `node scripts/lint-security.mjs --selftest` (samowystarczalny).

**Gate:** `node scripts/lint-security.mjs --selftest && node scripts/lint-security.mjs`

**deps:** []

### Task D8: CI — .forgejo/workflows/ci.yml

**Files:**
- Create: `.forgejo/workflows/ci.yml`

**Podejście:** Workflow na push/PR: pnpm install --frozen-lockfile → `pnpm lint` → `pnpm test:int` → `node scripts/lint-security.mjs`. BEZ tsc (21 znanych błędów) i BEZ test:e2e (wymaga serwera). Wzoruj składnię na `~/main-projects/crm/.forgejo/workflows/auto-update.yml`. Aktywacja runnera/secretów = checklist poranna, nie noc.

**Test:** plik istnieje i zawiera wszystkie trzy kroki.

**Gate:** `bash -lc 'test -f .forgejo/workflows/ci.yml && grep -q "test:int" .forgejo/workflows/ci.yml && grep -q "lint-security" .forgejo/workflows/ci.yml && grep -q "frozen-lockfile" .forgejo/workflows/ci.yml'`

**deps:** [D7]

### Task D9: docs/design-system.md — kodyfikacja smaku (PROPOZYCJA)

**Files:**
- Create: `docs/design-system.md`
- Ref: `theme.css` / semantic classes (mapa: Konwencje), `PAGE_DESIGN.md`

**Podejście:** Skodyfikuj STAN FAKTYCZNY (nie wymyślaj nowego brandu): sekcje `## Tokeny` (kolory z theme.css z rolami), `## Typografia` (skala, fonty), `## Spacing i layout`, `## Komponenty` (reguły użycia bloków), `## Microcopy` (głos, PL/EN, przykłady dobrych/złych CTA). Każdy token z odwołaniem do pliku źródłowego. Wynik = propozycja do porannego review usera.

**Test:** struktura + objętość.

**Gate:** `bash -lc '[ -f docs/design-system.md ] && [ $(wc -l < docs/design-system.md) -ge 80 ] && grep -q "## Tokeny" docs/design-system.md && grep -q "## Typografia" docs/design-system.md && grep -q "## Microcopy" docs/design-system.md'`

**deps:** []

---

## Checklist poranna (poza pętlą)

- [x] Przejrzyj diffy testów security — zrobione adwersaryjnym audytem C (rerun bramek + kontrola asercji, 2026-07-07).
- [ ] `docs/design-system.md` — review i decyzja (to propozycja).
- [x] Aktywuj CI: przeniesione na GitHub Actions (repo deployuje z GitHuba) — aktywne od pusha 2026-07-07, nocny cron 5:30 UTC.
- [ ] Decyzja o niedokommitowanej migracji `src/migrations/20260618_200715_program_price.json` (ryzyko fail-fast migrate na deployu — znane sprzed przebiegu).
- [x] Merge: cherry-pick 15 commitów na `security/hardening-to-main` → main (2026-07-07). Bramki przed pushem: 324 testy PASS, lint-security 0/417, pnpm lint czysty, pnpm build exit 0.
