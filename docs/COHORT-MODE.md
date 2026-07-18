# Tryb kohortowy (cohort mode) — przewodnik operatora

Stan: zbudowane 2026-07-18 (branch `feat/cohort-mode`). Spec:
`docs/superpowers/specs/2026-07-18-cohort-mode-design.md`, plan:
`docs/superpowers/plans/2026-07-18-cohort-mode.md`. Wzorzec mechanik: primal60
(Dadmode60) — tamta apka zostaje osobno, devince ma silnik generyczny.

## Co to daje

Kurs z `deliveryMode: 'cohort'` działa jak program dzienny: lekcja dnia N
(pole `nr`) odblokowuje się o `unlockHour` (default 6:00, `Europe/Warsaw`) w
dniu `startDate kohorty + N-1`. Uczestnik robi dzienny check-in (pola
konfigurowalne per kurs + wbudowane „minimum" i notatka), widzi streak,
heatmapę, pomiary (punkty D0/D30/… wg configu) i cele ukończenia. Admin
omija cały gating.

## Konfiguracja nowego kursu kohortowego (zero kodu)

1. Payload admin → Program → `deliveryMode: Kohortowy` → zakładka **Kohorta**:
   `programLength`, godzina/strefa, pola check-inu (boolean/number/select/text,
   sekcje), punkty+metryki pomiarów, cele ukończenia (`minimumDaysTarget` +
   `extraTargets`: „N check-inów gdzie pole F ∈ {wartości}").
2. Lekcje: standardowo, `nr` = dzień programu (1..programLength).
3. Kolekcja **Cohorts**: nazwa + program + `startDate` (dzień 1).
4. Wejście uczestników:
   - **Stripe**: zakup jak zwykle; webhook dopisuje purchases i przypisuje do
     najbliższej przyszłej kohorty (fallback: ostatnia; brak kohort →
     członkostwo przypisujesz ręcznie w `Cohort Members`).
   - **Invite**: kolekcja **Course Invites** (email+program+kohorta) — token
     7 dni, jednorazowy; mail przez Brevo idzie automatycznie, `joinUrl`
     widoczny w adminie do ręcznego wysłania. `/join/<token>` zakłada konto
     (email z invite'a) i przypisuje kohortę.

## Strony uczestnika (courses.devince.dev)

- `/<slug>/dzisiaj` — dzień N z X, streak, lekcja dnia, check-in (+ backfill
  wczoraj), countdown przed startem, podsumowanie po programie.
- `/<slug>/postepy` — cele ukończenia, heatmapa, pomiary, trendy 7-dniowe.
- Player: zablokowane lekcje mają kłódki i etykietę „odblokuje się …";
  wejście URL-em → ekran blokady (treść nie jest renderowana ani zwracana
  przez REST — egzekwuje `enrolledOrAdmin`).
- `/account/agent` — klucze MCP (`dvc_…`, max 5, revoke; plaintext pokazany raz).

## MCP uczestnika

Endpoint `POST /api/agent/mcp` (Bearer = klucz z `/account/agent`), rate-limit
60/min. Narzędzia: `get_today`, `save_checkin`, `complete_lesson`,
`get_progress`, `save_measurement` (+ arg `program` przy >1 kursie).
`get_today` zwraca metadane planu dnia (tytuł, `why`/`what`/`dod`), NIE pełną
treść lekcji (ciężki Lexical celowo pominięty) — pełną lekcję czyta się w UI.
Podpięcie: `claude mcp add --transport http devince-kurs
https://courses.devince.dev/api/agent/mcp --header "Authorization: Bearer <KLUCZ>"`.

## Admin

- CRUD kohort/invite'ów/członkostw/check-inów: Payload admin.
- `/cohorts-admin` (courses host, tylko admin): roster „dziś w kohorcie"
  (kto zrobił minimum).
- Refund Stripe zdejmuje purchases **i** członkostwo w kohorcie.

## Uwagi techniczne

- Matematyka dat: WYŁĄCZNIE `src/utilities/cohortUnlock.ts`; logika zapisu:
  `src/utilities/cohortActions.ts` (wspólna dla HTTP i MCP).
- Check-in/pomiar = upsert po kluczu naturalnym (unikalne indeksy DB); zapis
  check-inu tylko dziś/wczoraj i tylko w oknie programu; `values` walidowane
  serwerowo wg configu programu.
- Zmiana `checkinFields` działa wprzód (stare wpisy nie są re-walidowane).
- Seed do testów lokalnych: `pnpm tsx scripts/seed-cohort-test.ts`
  (kursant@test.dev / test-kursant-123, kurs `test-kohorta`).
