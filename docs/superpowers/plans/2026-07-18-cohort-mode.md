# Tryb kohortowy (cohort mode) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generyczny silnik kohortowy (drip lekcji, check-iny, pomiary, streak, invite'y, MCP uczestnika) jako `deliveryMode: 'cohort'` na kolekcji `program`, wg `docs/superpowers/specs/2026-07-18-cohort-mode-design.md`.

**Architecture:** Czysta matematyka dat w `src/utilities/cohortUnlock.ts` (Intl, bez zależności); logika domenowa w `src/utilities/cohortActions.ts` używana przez route'y HTTP i MCP; gating treści egzekwowany w access `enrolledOrAdmin` (async, `nr <= maxUnlockedDay`); dane w 6 nowych kolekcjach Payload z kluczami naturalnymi (unikalne indeksy w migracji).

**Tech Stack:** Next.js 15 App Router, Payload CMS 3.86 (Postgres), vitest, `mcp-handler` (jedyna nowa zależność, Task 14).

## Global Constraints

- DB schema TYLKO przez migrację Payload (`push: false`) — Task 3 tworzy JEDNĄ migrację; potem `pnpm generate:types`.
- `src/payload-types.ts` jest generowany — nigdy nie edytować ręcznie.
- Input w route'ach: body jako `unknown`, ręczne zawężanie pól (konwencja repo — BEZ zod).
- `userId` ZAWSZE z sesji (`payload.auth`) lub z klucza API — NIGDY z inputu (BOLA).
- Ceny/authz z DB, nie od klienta. Security-sensitive route'y: jednolite 403 bez wycieku stanu.
- Microcopy UI po polsku. Styl kodu: single quotes, bez średników, jak sąsiednie pliki.
- Testy kolokowane `*.test.ts` (vitest node env); inwarianty cross-cutting w `src/security/`.
- Timezone default `Europe/Warsaw`, unlock hour default 6; oba konfigurowalne per program.
- Komenda weryfikacji: `pnpm test:int && node scripts/lint-security.mjs && pnpm lint` (build w Task 16).
- Commity: konwencja `feat:`/`test:`/`docs:` + stopka Co-Authored-By jak w repo.

---

### Task 1: `cohortUnlock.ts` — czysta matematyka dat (TDD)

**Files:**
- Create: `src/utilities/cohortUnlock.ts`
- Test: `src/utilities/cohortUnlock.test.ts`

**Interfaces:**
- Produces: `type CohortClock = { startDate: string; unlockHour: number; timezone: string; programLength: number }`, `unlockAt(day, clock): Date`, `isUnlocked(day, clock, now?, isAdmin?): boolean`, `programDay(clock, now?): number`, `dateInTz(now, tz): string` (YYYY-MM-DD), `todayInTz(clock, now?)`, `yesterdayInTz(clock, now?)`, `canWriteCheckin(dateStr, clock, now?): boolean`, `maxUnlockedDay(clock, now?): number`, `datePlusDays(dateStr, days): string`, `unlockLabel(day, clock, now?): string`.

- [ ] **Step 1: Napisz failing test**

```ts
// src/utilities/cohortUnlock.test.ts
import { describe, expect, it } from 'vitest'
import {
  canWriteCheckin,
  datePlusDays,
  isUnlocked,
  maxUnlockedDay,
  programDay,
  unlockAt,
  unlockLabel,
  type CohortClock,
} from './cohortUnlock'

const clock: CohortClock = {
  startDate: '2026-07-01',
  unlockHour: 6,
  timezone: 'Europe/Warsaw',
  programLength: 60,
}

describe('unlockAt', () => {
  it('dzień 1 odblokowuje się o 6:00 Warszawy w dniu startu (CEST = UTC+2)', () => {
    expect(unlockAt(1, clock).toISOString()).toBe('2026-07-01T04:00:00.000Z')
  })
  it('dzień N = start + N-1 dni', () => {
    expect(unlockAt(10, clock).toISOString()).toBe('2026-07-10T04:00:00.000Z')
  })
  it('poprawny offset zimą (CET = UTC+1)', () => {
    const winter: CohortClock = { ...clock, startDate: '2026-01-05' }
    expect(unlockAt(1, winter).toISOString()).toBe('2026-01-05T05:00:00.000Z')
  })
})

describe('isUnlocked', () => {
  it('false przed 6:00, true po 6:00', () => {
    expect(isUnlocked(1, clock, new Date('2026-07-01T03:59:00Z'))).toBe(false)
    expect(isUnlocked(1, clock, new Date('2026-07-01T04:00:00Z'))).toBe(true)
  })
  it('range guard: dzień 0 i 61 zawsze zablokowane', () => {
    const now = new Date('2026-09-30T12:00:00Z')
    expect(isUnlocked(0, clock, now)).toBe(false)
    expect(isUnlocked(61, clock, now)).toBe(false)
  })
  it('admin bypass — ale nie poza zakresem', () => {
    const before = new Date('2026-06-01T00:00:00Z')
    expect(isUnlocked(30, clock, before, true)).toBe(true)
    expect(isUnlocked(61, clock, before, true)).toBe(false)
  })
})

describe('programDay', () => {
  it('dzień startu = 1 (nawet przed 6:00)', () => {
    expect(programDay(clock, new Date('2026-07-01T01:00:00Z'))).toBe(1)
  })
  it('przed startem < 1, po programie > 60', () => {
    expect(programDay(clock, new Date('2026-06-30T12:00:00Z'))).toBe(0)
    expect(programDay(clock, new Date('2026-09-10T12:00:00Z'))).toBe(72)
  })
  it('granica północy liczona w TZ programu: 23:30 UTC = 1:30 następnego dnia w Warszawie', () => {
    expect(programDay(clock, new Date('2026-07-01T23:30:00Z'))).toBe(2)
  })
})

describe('canWriteCheckin', () => {
  const now = new Date('2026-07-10T12:00:00Z')
  it('dziś i wczoraj OK, przedwczoraj i jutro nie', () => {
    expect(canWriteCheckin('2026-07-10', clock, now)).toBe(true)
    expect(canWriteCheckin('2026-07-09', clock, now)).toBe(true)
    expect(canWriteCheckin('2026-07-08', clock, now)).toBe(false)
    expect(canWriteCheckin('2026-07-11', clock, now)).toBe(false)
  })
})

describe('maxUnlockedDay', () => {
  it('0 przed startem', () => {
    expect(maxUnlockedDay(clock, new Date('2026-06-15T12:00:00Z'))).toBe(0)
  })
  it('przed 6:00 dnia N → N-1; po 6:00 → N', () => {
    expect(maxUnlockedDay(clock, new Date('2026-07-05T03:00:00Z'))).toBe(4)
    expect(maxUnlockedDay(clock, new Date('2026-07-05T05:00:00Z'))).toBe(5)
  })
  it('po końcu programu → programLength', () => {
    expect(maxUnlockedDay(clock, new Date('2027-01-01T12:00:00Z'))).toBe(60)
  })
})

describe('datePlusDays', () => {
  it('przechodzi przez granicę miesiąca i roku', () => {
    expect(datePlusDays('2026-07-31', 1)).toBe('2026-08-01')
    expect(datePlusDays('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('unlockLabel', () => {
  it('dziś / jutro / dzień tygodnia', () => {
    const now = new Date('2026-07-05T03:00:00Z')
    expect(unlockLabel(5, clock, now)).toBe('odblokuje się dziś o 6:00')
    expect(unlockLabel(6, clock, now)).toBe('odblokuje się jutro o 6:00')
    // 2026-07-11 to sobota
    expect(unlockLabel(11, clock, now)).toContain('sobota')
  })
})
```

- [ ] **Step 2: Uruchom test — ma nie przejść**

Run: `pnpm exec vitest run src/utilities/cohortUnlock.test.ts`
Expected: FAIL — `Cannot find module './cohortUnlock'`

- [ ] **Step 3: Implementacja**

```ts
// src/utilities/cohortUnlock.ts
// Czysta matematyka dat trybu kohortowego. Jedyne miejsce w repo liczące
// odblokowania/dni programu — nikt inny nie duplikuje obliczeń dat.
// Bez zależności: wyłącznie Intl (repo nie ma date-fns).

export type CohortClock = {
  startDate: string // 'YYYY-MM-DD' (cohorts.startDate)
  unlockHour: number // pełna godzina lokalna, default 6
  timezone: string // IANA, default 'Europe/Warsaw'
  programLength: number // liczba dni programu
}

const DAY_MS = 86_400_000

function tzOffsetMs(at: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const p: Record<string, string> = {}
  for (const part of dtf.formatToParts(at)) p[part.type] = part.value
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  )
  return asUtc - at.getTime()
}

// Instant UTC odpowiadający `hour:00` czasu ściennego `timeZone` w dniu `dateStr`.
// Przejścia DST w Europie zachodzą o 2:00/3:00 — godzina odblokowania 6:00 nigdy
// nie wpada w lukę, więc pojedyncza korekta offsetu jest dokładna.
function zonedInstant(dateStr: string, hour: number, timeZone: string): Date {
  const guess = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00Z`)
  return new Date(guess.getTime() - tzOffsetMs(guess, timeZone))
}

export function datePlusDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10)
}

export function dateInTz(now: Date, timeZone: string): string {
  // en-CA formatuje jako YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function unlockAt(day: number, clock: CohortClock): Date {
  return zonedInstant(datePlusDays(clock.startDate, day - 1), clock.unlockHour, clock.timezone)
}

export function isUnlocked(
  day: number,
  clock: CohortClock,
  now: Date = new Date(),
  isAdmin = false,
): boolean {
  if (day < 1 || day > clock.programLength) return false
  if (isAdmin) return true
  return now.getTime() >= unlockAt(day, clock).getTime()
}

export function programDay(clock: CohortClock, now: Date = new Date()): number {
  const today = dateInTz(now, clock.timezone)
  return Math.round((Date.parse(today) - Date.parse(clock.startDate)) / DAY_MS) + 1
}

export function todayInTz(clock: CohortClock, now: Date = new Date()): string {
  return dateInTz(now, clock.timezone)
}

export function yesterdayInTz(clock: CohortClock, now: Date = new Date()): string {
  return datePlusDays(dateInTz(now, clock.timezone), -1)
}

// Okno zapisu check-inu: wyłącznie dziś lub wczoraj (czas programu).
export function canWriteCheckin(dateStr: string, clock: CohortClock, now: Date = new Date()): boolean {
  return dateStr === todayInTz(clock, now) || dateStr === yesterdayInTz(clock, now)
}

// Najwyższy odblokowany dzień: 0 przed startem, clamp do programLength.
export function maxUnlockedDay(clock: CohortClock, now: Date = new Date()): number {
  const day = programDay(clock, now)
  if (day < 1) return 0
  const capped = Math.min(day, clock.programLength)
  return isUnlocked(capped, clock, now) ? capped : Math.max(0, capped - 1)
}

export function unlockLabel(day: number, clock: CohortClock, now: Date = new Date()): string {
  const at = unlockAt(day, clock)
  const hour = `${clock.unlockHour}:00`
  const diff = Math.round(
    (Date.parse(dateInTz(at, clock.timezone)) - Date.parse(dateInTz(now, clock.timezone))) / DAY_MS,
  )
  if (diff <= 0) return `odblokuje się dziś o ${hour}`
  if (diff === 1) return `odblokuje się jutro o ${hour}`
  const weekday = new Intl.DateTimeFormat('pl-PL', { timeZone: clock.timezone, weekday: 'long' }).format(at)
  if (diff < 7) return `odblokuje się w ${weekday} o ${hour}`
  const date = new Intl.DateTimeFormat('pl-PL', { timeZone: clock.timezone, day: 'numeric', month: 'long' }).format(at)
  return `odblokuje się ${date} (${weekday}) o ${hour}`
}
```

- [ ] **Step 4: Testy zielone**

Run: `pnpm exec vitest run src/utilities/cohortUnlock.test.ts`
Expected: PASS (wszystkie)

- [ ] **Step 5: Commit**

```bash
git add src/utilities/cohortUnlock.ts src/utilities/cohortUnlock.test.ts
git commit -m "feat(cohort): cohortUnlock — czysta matematyka dat trybu kohortowego"
```

---

### Task 2: `cohortProgress.ts` — streak, ukończenie, trendy (TDD)

**Files:**
- Create: `src/utilities/cohortProgress.ts`
- Test: `src/utilities/cohortProgress.test.ts`

**Interfaces:**
- Consumes: `datePlusDays` z Task 1.
- Produces: `type CheckinRow = { date: string; minimumDone: boolean; values?: Record<string, unknown> | null }`, `type ExtraTarget = { label?: string | null; fieldKey: string; matchValues: string[]; target: number }`, `type CompletionConfig = { minimumDaysTarget: number; extraTargets?: ExtraTarget[] | null }`, `minimumStreak(checkins, today): number`, `completionStatus(checkins, config): { minimumDays: number; extras: (ExtraTarget & { count: number })[]; done: boolean }`, `weeklyAvg(points: { date: string; value: number }[]): { date: string; value: number }[]`.

- [ ] **Step 1: Napisz failing test**

```ts
// src/utilities/cohortProgress.test.ts
import { describe, expect, it } from 'vitest'
import { completionStatus, minimumStreak, weeklyAvg, type CheckinRow } from './cohortProgress'

const c = (date: string, minimumDone: boolean, values: Record<string, unknown> = {}): CheckinRow => ({
  date,
  minimumDone,
  values,
})

describe('minimumStreak', () => {
  it('liczy kolejne dni z minimum kończące się dziś', () => {
    const rows = [c('2026-07-08', true), c('2026-07-09', true), c('2026-07-10', true)]
    expect(minimumStreak(rows, '2026-07-10')).toBe(3)
  })
  it('dziś bez wpisu → liczy od wczoraj (dzień trwa)', () => {
    const rows = [c('2026-07-08', true), c('2026-07-09', true)]
    expect(minimumStreak(rows, '2026-07-10')).toBe(2)
  })
  it('luka lub minimumDone=false przerywa', () => {
    const rows = [c('2026-07-07', true), c('2026-07-09', false), c('2026-07-10', true)]
    expect(minimumStreak(rows, '2026-07-10')).toBe(1)
  })
  it('pusto → 0', () => {
    expect(minimumStreak([], '2026-07-10')).toBe(0)
  })
})

describe('completionStatus', () => {
  const config = {
    minimumDaysTarget: 3,
    extraTargets: [{ fieldKey: 'trainingType', matchValues: ['sila_A', 'sila_B'], target: 2 }],
  }
  it('zlicza dni z minimum i dopasowania extraTargets', () => {
    const rows = [
      c('2026-07-01', true, { trainingType: 'sila_A' }),
      c('2026-07-02', true, { trainingType: 'cardio' }),
      c('2026-07-03', true, { trainingType: 'sila_B' }),
      c('2026-07-04', false, { trainingType: 'sila_A' }),
    ]
    const s = completionStatus(rows, config)
    expect(s.minimumDays).toBe(3)
    expect(s.extras[0].count).toBe(3) // extraTarget liczy po values, nie po minimum
    expect(s.done).toBe(true)
  })
  it('done=false gdy dowolny cel niespełniony', () => {
    const rows = [c('2026-07-01', true, { trainingType: 'cardio' })]
    expect(completionStatus(rows, config).done).toBe(false)
  })
  it('brak extraTargets → tylko minimumDaysTarget', () => {
    const rows = [c('2026-07-01', true), c('2026-07-02', true), c('2026-07-03', true)]
    expect(completionStatus(rows, { minimumDaysTarget: 3 }).done).toBe(true)
  })
})

describe('weeklyAvg', () => {
  it('średnia z okna [date-6d, date]; luki nie przerywają', () => {
    const out = weeklyAvg([
      { date: '2026-07-01', value: 100 },
      { date: '2026-07-04', value: 90 },
      { date: '2026-07-10', value: 80 },
    ])
    expect(out[0]).toEqual({ date: '2026-07-01', value: 100 })
    expect(out[1]).toEqual({ date: '2026-07-04', value: 95 }) // (100+90)/2
    expect(out[2]).toEqual({ date: '2026-07-10', value: 85 }) // (90+80)/2 — 07-01 poza oknem
  })
})
```

- [ ] **Step 2: Uruchom test — FAIL** (`Cannot find module './cohortProgress'`)

Run: `pnpm exec vitest run src/utilities/cohortProgress.test.ts`

- [ ] **Step 3: Implementacja**

```ts
// src/utilities/cohortProgress.ts
// Agregacje trybu kohortowego (streak / ukończenie / trendy) na danych JEDNEGO
// usera — liczone w pamięci (≤ programLength wierszy), bez SQL-owych agregatów.
import { datePlusDays } from './cohortUnlock'

export type CheckinRow = {
  date: string
  minimumDone: boolean
  values?: Record<string, unknown> | null
}

export type ExtraTarget = {
  label?: string | null
  fieldKey: string
  matchValues: string[]
  target: number
}

export type CompletionConfig = {
  minimumDaysTarget: number
  extraTargets?: ExtraTarget[] | null
}

// Kolejne dni z minimumDone kończące się dziś; jeśli dziś nie ma wpisu,
// liczymy od wczoraj (dzień jeszcze trwa).
export function minimumStreak(checkins: CheckinRow[], today: string): number {
  const byDate = new Map(checkins.map((c) => [c.date, c.minimumDone]))
  let cursor = today
  if (!byDate.get(cursor)) cursor = datePlusDays(cursor, -1)
  let streak = 0
  while (byDate.get(cursor)) {
    streak++
    cursor = datePlusDays(cursor, -1)
  }
  return streak
}

export function completionStatus(checkins: CheckinRow[], config: CompletionConfig) {
  const minimumDays = checkins.filter((c) => c.minimumDone).length
  const extras = (config.extraTargets ?? []).map((t) => ({
    ...t,
    count: checkins.filter((c) => t.matchValues.includes(String(c.values?.[t.fieldKey] ?? ''))).length,
  }))
  const done = minimumDays >= config.minimumDaysTarget && extras.every((e) => e.count >= e.target)
  return { minimumDays, extras, done }
}

// Średnia krocząca 7 dni: dla każdego istniejącego punktu średnia wartości
// z okna [date-6d, date]. Luki w danych nie przerywają trendu.
export function weeklyAvg(points: { date: string; value: number }[]): { date: string; value: number }[] {
  return points.map((p) => {
    const from = datePlusDays(p.date, -6)
    const window = points.filter((q) => q.date >= from && q.date <= p.date)
    const avg = window.reduce((sum, q) => sum + q.value, 0) / window.length
    return { date: p.date, value: Math.round(avg * 10) / 10 }
  })
}
```

- [ ] **Step 4: Testy zielone**

Run: `pnpm exec vitest run src/utilities/cohortProgress.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utilities/cohortProgress.ts src/utilities/cohortProgress.test.ts
git commit -m "feat(cohort): cohortProgress — streak, cele ukończenia, trendy 7d"
```

---

### Task 3: Kolekcje + pola Programu + migracja + typy

**Files:**
- Create: `src/collections/Cohorts.ts`, `src/collections/CohortMembers.ts`, `src/collections/Checkins.ts`, `src/collections/CourseMeasurements.ts`, `src/collections/CourseInvites.ts`, `src/collections/AgentApiKeys.ts`
- Modify: `src/collections/Program/index.ts` (nowe pola w sidebar + zakładka), `src/payload.config.ts:93-109` (rejestracja)
- Create (generowane): `src/migrations/<timestamp>_cohort_mode.ts` + `.json`, aktualizacja `src/payload-types.ts`

**Interfaces:**
- Produces: kolekcje `cohorts`, `cohort-members` (unique [user, program]), `checkins` (unique [user, program, date]), `course-measurements` (unique [user, program, point]), `course-invites` (token unique), `agent-api-keys` (keyHash unique). Na `program`: `deliveryMode: 'self-paced' | 'cohort'` + grupa `cohortConfig` (programLength, unlockHour, timezone, minimumLabel, checkinFields[], measurementPoints[], measurementMetrics[], completion { minimumDaysTarget, extraTargets[] }). Typy w `@/payload-types`: `Cohort`, `CohortMember`, `Checkin`, `CourseMeasurement`, `CourseInvite`, `AgentApiKey`.

- [ ] **Step 1: Wydziel `ownOrAdmin` do `src/access/ownOrAdmin.ts`** (używany przez 4 nowe kolekcje i LessonProgress — DRY)

```ts
// src/access/ownOrAdmin.ts
import type { Access } from 'payload'

// Zalogowany czyta tylko własne wiersze; admin wszystko. Zapisy uczestnika idą
// wyłącznie przez route'y aplikacji (Local API + overrideAccess), więc CRUD na
// kolekcji jest admin-only.
export const ownOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if ((user.roles ?? []).includes('admin')) return true
  return { user: { equals: user.id } }
}
```

W `src/collections/LessonProgress.ts` usuń lokalną definicję `ownOrAdmin` i dodaj `import { ownOrAdmin } from '../access/ownOrAdmin'`.

- [ ] **Step 2: Nowe kolekcje**

```ts
// src/collections/Cohorts.ts
import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'

export const Cohorts: CollectionConfig = {
  slug: 'cohorts',
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'program', 'startDate'] },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'program', type: 'relationship', relationTo: 'program', required: true, index: true },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayOnly' }, description: 'Dzień 1 programu — lekcje odblokowują się od tej daty o godzinie z konfiguracji kursu' },
    },
  ],
}
```

```ts
// src/collections/CohortMembers.ts
import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'
import { ownOrAdmin } from '../access/ownOrAdmin'

export const CohortMembers: CollectionConfig = {
  slug: 'cohort-members',
  access: { read: ownOrAdmin, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: { useAsTitle: 'id', defaultColumns: ['user', 'cohort', 'program', 'joinedAt'] },
  // Jedna kohorta na (user, program) — atomowo na poziomie DB.
  indexes: [{ fields: ['user', 'program'], unique: true }],
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'cohort', type: 'relationship', relationTo: 'cohorts', required: true },
    { name: 'program', type: 'relationship', relationTo: 'program', required: true, index: true },
    { name: 'joinedAt', type: 'date' },
  ],
}
```

```ts
// src/collections/Checkins.ts
import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'
import { ownOrAdmin } from '../access/ownOrAdmin'

export const Checkins: CollectionConfig = {
  slug: 'checkins',
  access: { read: ownOrAdmin, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: { useAsTitle: 'date', defaultColumns: ['user', 'program', 'date', 'minimumDone'] },
  // Jeden check-in na (user, program, dzień) — upsert w route łapie wyścig.
  indexes: [{ fields: ['user', 'program', 'date'], unique: true }],
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'program', type: 'relationship', relationTo: 'program', required: true, index: true },
    { name: 'date', type: 'text', required: true }, // 'YYYY-MM-DD' w TZ programu
    { name: 'programDay', type: 'number', required: true },
    { name: 'minimumDone', type: 'checkbox', required: true, defaultValue: false },
    { name: 'note', type: 'textarea' },
    // Wartości pól zdefiniowanych w program.cohortConfig.checkinFields —
    // walidowane serwerowo w route wg configu (validateCheckinValues).
    { name: 'values', type: 'json' },
  ],
}
```

```ts
// src/collections/CourseMeasurements.ts
import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'
import { ownOrAdmin } from '../access/ownOrAdmin'

export const CourseMeasurements: CollectionConfig = {
  slug: 'course-measurements',
  access: { read: ownOrAdmin, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: { useAsTitle: 'point', defaultColumns: ['user', 'program', 'point', 'recordedAt'] },
  indexes: [{ fields: ['user', 'program', 'point'], unique: true }],
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'program', type: 'relationship', relationTo: 'program', required: true, index: true },
    { name: 'point', type: 'text', required: true }, // klucz z measurementPoints, np. 'D0'
    { name: 'values', type: 'json' }, // metryka -> liczba, wg measurementMetrics
    { name: 'recordedAt', type: 'date' },
  ],
}
```

```ts
// src/collections/CourseInvites.ts
import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export const CourseInvites: CollectionConfig = {
  slug: 'course-invites',
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'program', 'cohort', 'expiresAt', 'usedAt'] },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create') {
          data.token = crypto.randomUUID()
          data.expiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString()
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'email', type: 'email', required: true },
    { name: 'program', type: 'relationship', relationTo: 'program', required: true },
    { name: 'cohort', type: 'relationship', relationTo: 'cohorts', required: true },
    { name: 'token', type: 'text', unique: true, index: true, admin: { readOnly: true } },
    { name: 'expiresAt', type: 'date', admin: { readOnly: true } },
    { name: 'usedAt', type: 'date', admin: { readOnly: true, description: 'Ustawiane atomowo przy dołączeniu — puste = nieużyte' } },
    { name: 'createdBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    {
      name: 'joinUrl',
      type: 'text',
      virtual: true,
      admin: { readOnly: true, description: 'Link do wysłania uczestnikowi' },
      hooks: {
        afterRead: [
          ({ siblingData }) =>
            siblingData?.token
              ? `${process.env.NEXT_PUBLIC_COURSES_URL ?? ''}/join/${siblingData.token}`
              : null,
        ],
      },
    },
  ],
}
```

```ts
// src/collections/AgentApiKeys.ts
import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'
import { ownOrAdmin } from '../access/ownOrAdmin'

// Klucze MCP uczestnika: w DB wyłącznie hash SHA-256 + prefix; plaintext widzi
// tylko właściciel, raz, w odpowiedzi POST /api/courses/agent-keys.
export const AgentApiKeys: CollectionConfig = {
  slug: 'agent-api-keys',
  access: { read: ownOrAdmin, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: { useAsTitle: 'name', defaultColumns: ['user', 'name', 'keyPrefix', 'revokedAt'] },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'name', type: 'text', required: true },
    { name: 'keyPrefix', type: 'text', required: true },
    { name: 'keyHash', type: 'text', required: true, unique: true, index: true },
    { name: 'lastUsedAt', type: 'date' },
    { name: 'revokedAt', type: 'date' },
  ],
}
```

- [ ] **Step 3: Pola Programu**

W `src/collections/Program/index.ts`: dodaj do pól sidebar (obok `featured`):

```ts
{
  name: 'deliveryMode',
  type: 'select',
  defaultValue: 'self-paced',
  options: [
    { label: 'Własne tempo', value: 'self-paced' },
    { label: 'Kohortowy (dzienny drip)', value: 'cohort' },
  ],
  admin: { position: 'sidebar' },
},
```

oraz nową zakładkę `Kohorta` (w istniejącym `tabs`, po `Sylabus`):

```ts
{
  label: 'Kohorta',
  admin: { condition: (data) => data?.deliveryMode === 'cohort' },
  fields: [
    {
      name: 'cohortConfig',
      type: 'group',
      fields: [
        { name: 'programLength', type: 'number', required: true, min: 1, admin: { description: 'Liczba dni programu (dzień lekcji = pole nr)' } },
        { name: 'unlockHour', type: 'number', defaultValue: 6, min: 0, max: 23 },
        { name: 'timezone', type: 'text', defaultValue: 'Europe/Warsaw' },
        { name: 'minimumLabel', type: 'text', localized: true, admin: { description: 'Etykieta wbudowanego pola minimum, np. "Zrobiłem minimum"' } },
        {
          name: 'checkinFields',
          type: 'array',
          admin: { description: 'Dodatkowe pola dziennego check-inu (minimum + notatka są wbudowane)' },
          fields: [
            { name: 'key', type: 'text', required: true },
            { name: 'label', type: 'text', required: true, localized: true },
            {
              name: 'fieldType',
              type: 'select',
              required: true,
              defaultValue: 'number',
              options: [
                { label: 'Tak/nie', value: 'boolean' },
                { label: 'Liczba', value: 'number' },
                { label: 'Wybór', value: 'select' },
                { label: 'Tekst', value: 'text' },
              ],
            },
            { name: 'min', type: 'number', admin: { condition: (_, s) => s?.fieldType === 'number' } },
            { name: 'max', type: 'number', admin: { condition: (_, s) => s?.fieldType === 'number' } },
            {
              name: 'options',
              type: 'array',
              admin: { condition: (_, s) => s?.fieldType === 'select' },
              fields: [
                { name: 'value', type: 'text', required: true },
                { name: 'label', type: 'text', required: true, localized: true },
              ],
            },
            { name: 'section', type: 'text', localized: true, admin: { description: 'Nagłówek sekcji formularza (opcjonalny)' } },
          ],
        },
        {
          name: 'measurementPoints',
          type: 'array',
          fields: [
            { name: 'key', type: 'text', required: true },
            { name: 'label', type: 'text', required: true, localized: true },
          ],
        },
        {
          name: 'measurementMetrics',
          type: 'array',
          fields: [
            { name: 'key', type: 'text', required: true },
            { name: 'label', type: 'text', required: true, localized: true },
            { name: 'unit', type: 'text' },
            { name: 'min', type: 'number' },
            { name: 'max', type: 'number' },
          ],
        },
        {
          name: 'completion',
          type: 'group',
          fields: [
            { name: 'minimumDaysTarget', type: 'number', admin: { description: 'Ile dni z minimum = ukończenie (np. 48)' } },
            {
              name: 'extraTargets',
              type: 'array',
              fields: [
                { name: 'label', type: 'text', localized: true },
                { name: 'fieldKey', type: 'text', required: true, admin: { description: 'Klucz pola z checkinFields' } },
                { name: 'matchValues', type: 'text', hasMany: true, required: true },
                { name: 'target', type: 'number', required: true },
              ],
            },
          ],
        },
      ],
    },
  ],
},
```

- [ ] **Step 4: Rejestracja w `src/payload.config.ts`**

Importy + dopisz do `collections:` po `LessonProgress`: `Cohorts, CohortMembers, Checkins, CourseMeasurements, CourseInvites, AgentApiKeys`.

- [ ] **Step 5: Typy + migracja**

Run: `pnpm generate:types`
Run: `pnpm payload migrate:create cohort_mode`
Expected: nowy plik `src/migrations/<ts>_cohort_mode.ts` + `.json`, zarejestrowany w `src/migrations/index.ts`. Sprawdź w wygenerowanym SQL, że są unikalne indeksy: `cohort_members` (user,program), `checkins` (user,program,date), `course_measurements` (user,program,point).

- [ ] **Step 6: Migracja na dev DB + testy repo zielone**

Run: `docker compose up -d && pnpm payload migrate`
Expected: `cohort_mode` zaaplikowana bez błędu.
Run: `pnpm test:int`
Expected: PASS (istniejące 336 testów + nowe z Task 1-2; test `enrolledOrAdmin.test.ts` jeszcze bez zmian — zielony).

- [ ] **Step 7: Commit**

```bash
git add src/collections src/access/ownOrAdmin.ts src/payload.config.ts src/payload-types.ts src/migrations
git commit -m "feat(cohort): kolekcje kohortowe + cohortConfig na programie + migracja"
```

---

### Task 4: Walidacja `values` wg configu (TDD, bez zod — konwencja repo)

**Files:**
- Create: `src/utilities/checkinValues.ts`
- Test: `src/utilities/checkinValues.test.ts`

**Interfaces:**
- Produces: `type FieldDef = { key: string; fieldType: 'boolean' | 'number' | 'select' | 'text'; min?: number | null; max?: number | null; options?: { value: string }[] | null }`, `validateCheckinValues(fields: FieldDef[], input: unknown): { ok: true; values: Record<string, unknown> } | { ok: false; error: string }`, `type MetricDef = { key: string; min?: number | null; max?: number | null }`, `validateMeasurementValues(metrics: MetricDef[], input: unknown): { ok: true; values: Record<string, number> } | { ok: false; error: string }`.

- [ ] **Step 1: Failing test**

```ts
// src/utilities/checkinValues.test.ts
import { describe, expect, it } from 'vitest'
import { validateCheckinValues, validateMeasurementValues, type FieldDef } from './checkinValues'

const fields: FieldDef[] = [
  { key: 'trainingType', fieldType: 'select', options: [{ value: 'sila_A' }, { value: 'cardio' }] },
  { key: 'steps', fieldType: 'number', min: 0, max: 100000 },
  { key: 'swapUpf', fieldType: 'boolean' },
  { key: 'memo', fieldType: 'text' },
]

describe('validateCheckinValues', () => {
  it('przyjmuje poprawne wartości i odrzuca nieznane klucze', () => {
    const ok = validateCheckinValues(fields, { trainingType: 'sila_A', steps: 8000 })
    expect(ok).toEqual({ ok: true, values: { trainingType: 'sila_A', steps: 8000 } })
    expect(validateCheckinValues(fields, { hack: 1 }).ok).toBe(false)
  })
  it('null czyści pole; brakujące pola są opcjonalne', () => {
    const ok = validateCheckinValues(fields, { steps: null })
    expect(ok).toEqual({ ok: true, values: { steps: null } })
  })
  it('egzekwuje typ, zakres i opcje selecta', () => {
    expect(validateCheckinValues(fields, { steps: 'duzo' }).ok).toBe(false)
    expect(validateCheckinValues(fields, { steps: -1 }).ok).toBe(false)
    expect(validateCheckinValues(fields, { steps: 100001 }).ok).toBe(false)
    expect(validateCheckinValues(fields, { trainingType: 'zumba' }).ok).toBe(false)
    expect(validateCheckinValues(fields, { swapUpf: 'tak' }).ok).toBe(false)
  })
  it('tekst max 2000 znaków; input nie-obiekt odrzucony', () => {
    expect(validateCheckinValues(fields, { memo: 'x'.repeat(2001) }).ok).toBe(false)
    expect(validateCheckinValues(fields, 'string').ok).toBe(false)
    expect(validateCheckinValues(fields, undefined)).toEqual({ ok: true, values: {} })
  })
})

describe('validateMeasurementValues', () => {
  const metrics = [{ key: 'weightKg', min: 30, max: 300 }, { key: 'pushups', min: 0, max: 200 }]
  it('tylko liczby w zakresie, nieznane klucze odrzucone', () => {
    expect(validateMeasurementValues(metrics, { weightKg: 92.5 })).toEqual({ ok: true, values: { weightKg: 92.5 } })
    expect(validateMeasurementValues(metrics, { weightKg: 10 }).ok).toBe(false)
    expect(validateMeasurementValues(metrics, { other: 1 }).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Uruchom — FAIL** — `pnpm exec vitest run src/utilities/checkinValues.test.ts`

- [ ] **Step 3: Implementacja**

```ts
// src/utilities/checkinValues.ts
// Serwerowa walidacja dynamicznych pól check-inu/pomiaru wg configu programu.
// Konwencja repo: unknown + ręczne zawężanie, bez zod. Granica zaufania: input
// przychodzi od klienta LUB z argumentów narzędzia MCP — zawsze przez te funkcje.

export type FieldDef = {
  key: string
  fieldType: 'boolean' | 'number' | 'select' | 'text'
  min?: number | null
  max?: number | null
  options?: { value: string }[] | null
}

export type MetricDef = { key: string; min?: number | null; max?: number | null }

type Result<T> = { ok: true; values: T } | { ok: false; error: string }

export function validateCheckinValues(
  fields: FieldDef[],
  input: unknown,
): Result<Record<string, unknown>> {
  if (input == null) return { ok: true, values: {} }
  if (typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'values musi być obiektem' }
  const defs = new Map(fields.map((f) => [f.key, f]))
  const values: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const def = defs.get(key)
    if (!def) return { ok: false, error: `Nieznane pole: ${key}` }
    if (raw == null) {
      values[key] = null
      continue
    }
    switch (def.fieldType) {
      case 'boolean':
        if (typeof raw !== 'boolean') return { ok: false, error: `${key}: oczekiwano tak/nie` }
        break
      case 'number':
        if (typeof raw !== 'number' || !Number.isFinite(raw)) return { ok: false, error: `${key}: oczekiwano liczby` }
        if (def.min != null && raw < def.min) return { ok: false, error: `${key}: minimum ${def.min}` }
        if (def.max != null && raw > def.max) return { ok: false, error: `${key}: maksimum ${def.max}` }
        break
      case 'select':
        if (typeof raw !== 'string' || !(def.options ?? []).some((o) => o.value === raw))
          return { ok: false, error: `${key}: niedozwolona wartość` }
        break
      case 'text':
        if (typeof raw !== 'string' || raw.length > 2000) return { ok: false, error: `${key}: tekst do 2000 znaków` }
        break
    }
    values[key] = raw
  }
  return { ok: true, values }
}

export function validateMeasurementValues(
  metrics: MetricDef[],
  input: unknown,
): Result<Record<string, number>> {
  if (typeof input !== 'object' || input == null || Array.isArray(input))
    return { ok: false, error: 'values musi być obiektem' }
  const defs = new Map(metrics.map((m) => [m.key, m]))
  const values: Record<string, number> = {}
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const def = defs.get(key)
    if (!def) return { ok: false, error: `Nieznana metryka: ${key}` }
    if (raw == null) continue
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return { ok: false, error: `${key}: oczekiwano liczby` }
    if (def.min != null && raw < def.min) return { ok: false, error: `${key}: minimum ${def.min}` }
    if (def.max != null && raw > def.max) return { ok: false, error: `${key}: maksimum ${def.max}` }
    values[key] = raw
  }
  return { ok: true, values }
}
```

- [ ] **Step 4: Testy zielone** — `pnpm exec vitest run src/utilities/checkinValues.test.ts` → PASS

- [ ] **Step 5: Commit**

```bash
git add src/utilities/checkinValues.ts src/utilities/checkinValues.test.ts
git commit -m "feat(cohort): walidacja dynamicznych pól check-inu/pomiarów wg configu"
```

---

### Task 5: `clockFor` + async `enrolledOrAdmin` (inwariant: treść zablokowanej lekcji nie wychodzi)

**Files:**
- Create: `src/utilities/cohortClock.ts`
- Modify: `src/access/enrolledOrAdmin.ts`
- Modify: `src/access/enrolledOrAdmin.test.ts` (dostosowanie do async + payload w req)
- Test: `src/security/cohortLessonGating.test.ts`

**Interfaces:**
- Consumes: `CohortClock`, `maxUnlockedDay` (Task 1); typy `Program`, `Cohort`, `CohortMember` (Task 3).
- Produces: `clockFor(program: Program, cohort: Cohort): CohortClock | null` (null gdy brak configu/startDate — traktuj jak zablokowane), `cohortMembership(payload, userId, programId): Promise<{ member: CohortMember; cohort: Cohort } | null>`; `enrolledOrAdmin` staje się `async` i zwraca `Where` z day-gatingiem dla programów kohortowych.

- [ ] **Step 1: `cohortClock.ts`**

```ts
// src/utilities/cohortClock.ts
import type { BasePayload } from 'payload'
import type { Cohort, CohortMember, Program } from '@/payload-types'
import type { CohortClock } from './cohortUnlock'

// Zegar kohorty z configu programu + daty startu kohorty. null = konfiguracja
// niekompletna → wywołujący traktuje wszystko jako zablokowane (fail-closed).
export function clockFor(program: Program, cohort: Cohort): CohortClock | null {
  const cfg = program.cohortConfig
  if (program.deliveryMode !== 'cohort' || !cfg?.programLength || !cohort.startDate) return null
  return {
    startDate: String(cohort.startDate).slice(0, 10),
    unlockHour: cfg.unlockHour ?? 6,
    timezone: cfg.timezone || 'Europe/Warsaw',
    programLength: cfg.programLength,
  }
}

// Membership usera w kursie kohortowym (jedna kohorta na program — unique index).
export async function cohortMembership(
  payload: BasePayload,
  userId: number,
  programId: number,
): Promise<{ member: CohortMember; cohort: Cohort } | null> {
  const res = await payload.find({
    collection: 'cohort-members',
    where: { and: [{ user: { equals: userId } }, { program: { equals: programId } }] },
    limit: 1,
    depth: 1, // populate cohort (potrzebny startDate)
    overrideAccess: true,
  })
  const member = res.docs[0]
  if (!member || typeof member.cohort !== 'object' || !member.cohort) return null
  return { member, cohort: member.cohort }
}
```

- [ ] **Step 2: Failing security test**

```ts
// src/security/cohortLessonGating.test.ts
// INWARIANT: treść zablokowanej lekcji kursu kohortowego nie opuszcza serwera —
// egzekwowane w access `enrolledOrAdmin` (warstwa zapytań), nie tylko w UI.
import { describe, expect, it, vi } from 'vitest'
import { enrolledOrAdmin } from '@/access/enrolledOrAdmin'

const COHORT_PROGRAM = {
  id: 7,
  deliveryMode: 'cohort',
  cohortConfig: { programLength: 60, unlockHour: 6, timezone: 'Europe/Warsaw' },
}
const SELF_PACED = { id: 3, deliveryMode: 'self-paced', cohortConfig: null }

function fakePayload({ programs = [], members = [] }: { programs?: unknown[]; members?: unknown[] }) {
  return {
    find: vi.fn(async ({ collection }: { collection: string }) => {
      if (collection === 'program') return { docs: programs }
      if (collection === 'cohort-members') return { docs: members }
      throw new Error(`unexpected collection ${collection}`)
    }),
  }
}

const req = (user: unknown, payload: unknown) => ({ req: { user, payload } }) as never

describe('enrolledOrAdmin — tryb kohortowy', () => {
  it('brak usera → false; admin → true', async () => {
    expect(await enrolledOrAdmin(req(null, fakePayload({})))).toBe(false)
    expect(await enrolledOrAdmin(req({ id: 1, roles: ['admin'], purchases: [] }, fakePayload({})))).toBe(true)
  })

  it('kurs self-paced: zwykły constraint program-in-purchases', async () => {
    const user = { id: 1, roles: ['customer'], purchases: [3] }
    const where = await enrolledOrAdmin(req(user, fakePayload({ programs: [SELF_PACED] })))
    expect(where).toEqual({ or: [{ program: { in: [3] } }] })
  })

  it('kurs kohortowy: constraint zawiera nr <= maxUnlockedDay', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-05T12:00:00Z')) // dzień 5 po 6:00
    const user = { id: 1, roles: ['customer'], purchases: [7] }
    const payload = fakePayload({
      programs: [COHORT_PROGRAM],
      members: [{ id: 11, user: 1, program: 7, cohort: { id: 2, startDate: '2026-07-01' } }],
    })
    const where = await enrolledOrAdmin(req(user, payload))
    expect(where).toEqual({
      or: [{ and: [{ program: { equals: 7 } }, { nr: { less_than_equal: 5 } }] }],
    })
    vi.useRealTimers()
  })

  it('kohortowy przed startem LUB bez membershipu → żadna lekcja nie przechodzi', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'))
    const user = { id: 1, roles: ['customer'], purchases: [7] }
    const before = await enrolledOrAdmin(
      req(user, fakePayload({ programs: [COHORT_PROGRAM], members: [{ id: 11, user: 1, program: 7, cohort: { id: 2, startDate: '2026-07-01' } }] })),
    )
    expect(before).toBe(false)
    const noMember = await enrolledOrAdmin(req(user, fakePayload({ programs: [COHORT_PROGRAM], members: [] })))
    expect(noMember).toBe(false)
    vi.useRealTimers()
  })

  it('mieszany zakup: self-paced pełny + kohortowy ograniczony dniem', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-05T12:00:00Z'))
    const user = { id: 1, roles: ['customer'], purchases: [3, 7] }
    const payload = fakePayload({
      programs: [SELF_PACED, COHORT_PROGRAM],
      members: [{ id: 11, user: 1, program: 7, cohort: { id: 2, startDate: '2026-07-01' } }],
    })
    const where = await enrolledOrAdmin(req(user, payload))
    expect(where).toEqual({
      or: [
        { program: { in: [3] } },
        { and: [{ program: { equals: 7 } }, { nr: { less_than_equal: 5 } }] },
      ],
    })
    vi.useRealTimers()
  })
})
```

- [ ] **Step 3: Uruchom — FAIL** — `pnpm exec vitest run src/security/cohortLessonGating.test.ts` (obecny `enrolledOrAdmin` zwraca `{ program: { in: ids } }` bez `or`)

- [ ] **Step 4: Implementacja**

```ts
// src/access/enrolledOrAdmin.ts
import type { Access, Where } from 'payload'
import { clockFor } from '@/utilities/cohortClock'
import { maxUnlockedDay } from '@/utilities/cohortUnlock'
import type { Cohort, Program } from '@/payload-types'

// Odczyt lekcji: admin wszystko; klient — lekcje kupionych programów, przy czym
// dla programów kohortowych DODATKOWO nr <= najwyższy odblokowany dzień jego
// kohorty. Inwariant: treść zablokowanej lekcji nie opuszcza serwera (dotyczy
// też REST/GraphQL Payloada, nie tylko stron).
export const enrolledOrAdmin: Access = async ({ req }) => {
  const { user, payload } = req
  if (!user) return false
  if (Array.isArray(user.roles) && user.roles.includes('admin')) return true
  const ids = (user.purchases ?? []).map((p) => (typeof p === 'object' && p ? p.id : p))
  if (ids.length === 0) return false

  const programs = await payload.find({
    collection: 'program',
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
    overrideAccess: true,
  })
  const cohortPrograms = programs.docs.filter((p) => (p as Program).deliveryMode === 'cohort') as Program[]
  const cohortIds = new Set(cohortPrograms.map((p) => p.id))
  const selfIds = ids.filter((id) => !cohortIds.has(id as number))

  const ors: Where[] = selfIds.length ? [{ program: { in: selfIds } }] : []

  if (cohortPrograms.length) {
    const memberships = await payload.find({
      collection: 'cohort-members',
      where: {
        and: [{ user: { equals: user.id } }, { program: { in: [...cohortIds] } }],
      },
      limit: 100,
      depth: 1,
      overrideAccess: true,
    })
    for (const m of memberships.docs) {
      const programId = typeof m.program === 'object' && m.program ? m.program.id : m.program
      const program = cohortPrograms.find((p) => p.id === programId)
      const cohort = typeof m.cohort === 'object' ? (m.cohort as Cohort) : null
      if (!program || !cohort) continue
      const clock = clockFor(program, cohort)
      if (!clock) continue // niekompletna konfiguracja → fail-closed
      const maxDay = maxUnlockedDay(clock)
      if (maxDay >= 1)
        ors.push({ and: [{ program: { equals: program.id } }, { nr: { less_than_equal: maxDay } }] })
    }
  }

  return ors.length ? { or: ors } : false
}
```

- [ ] **Step 5: Zaktualizuj istniejący `src/access/enrolledOrAdmin.test.ts`** — funkcja jest teraz async i dla samych programów self-paced wymaga `req.payload.find` zwracającego te programy; owiń wywołania w `await` i podaj fake payload (wzór z security testu: `fakePayload({ programs: [{ id: X, deliveryMode: 'self-paced' }] })`). Oczekiwany kształt dla czystych self-paced: `{ or: [{ program: { in: ids } }] }` — zaktualizuj asercje.

- [ ] **Step 6: Testy zielone**

Run: `pnpm exec vitest run src/security/cohortLessonGating.test.ts src/access/enrolledOrAdmin.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/access/enrolledOrAdmin.ts src/access/enrolledOrAdmin.test.ts src/utilities/cohortClock.ts src/security/cohortLessonGating.test.ts
git commit -m "feat(cohort): day-gating lekcji w enrolledOrAdmin — zablokowana treść nie opuszcza serwera"
```

---

### Task 6: `cohortActions.ts` — logika domenowa (wspólna dla route'ów i MCP) (TDD)

**Files:**
- Create: `src/utilities/cohortActions.ts`
- Test: `src/utilities/cohortActions.test.ts`

**Interfaces:**
- Consumes: `clockFor`, `cohortMembership` (Task 5), `canWriteCheckin`, `isUnlocked`, `programDay`, `todayInTz`, `maxUnlockedDay` (Task 1), `minimumStreak`, `completionStatus` (Task 2), `validateCheckinValues`, `validateMeasurementValues` (Task 4), `isEnrolled` z `@/utilities/courseProgress`.
- Produces (każda funkcja przyjmuje `payload` + `user` z sesji/klucza jako pierwsze parametry — BOLA):
  - `type CohortContext = { program: Program; cohort: Cohort; clock: CohortClock; isAdmin: boolean }`
  - `resolveCohortContext(payload, user, programSlug): Promise<CohortContext | { error: string; status: number }>` — program po slugu, `deliveryMode==='cohort'`, `isEnrolled` (admin zwalnia), membership; jednolite `{ error: 'forbidden', status: 403 }` gdy brak dostępu.
  - `saveCheckinAction(payload, user, ctx, input: { date: string; minimumDone: boolean; note?: string; values?: unknown }): Promise<{ ok: true; streak: number; programDay: number } | { ok: false; error: string; status: number }>` — okno dziś/wczoraj, walidacja values, upsert po (user, program, date), auto-complete lekcji dnia (patrz niżej).
  - `saveMeasurementAction(payload, user, ctx, input: { point: string; values: unknown }): Promise<{ ok: true } | { ok: false; error: string; status: number }>`
  - `completeLessonAction(payload, user, ctx, day: number): Promise<{ ok: true } | { ok: false; error: string; status: number }>` — re-gating `isUnlocked` (admin bypass), idempotentny wpis `lesson-progress` dla lekcji o `nr === day`.
  - `getTodayData(payload, user, ctx): Promise<{ programDay: number; state: 'before' | 'active' | 'after'; streak: number; todayCheckin: Checkin | null; lesson: Lesson | null; unlocksAt: string | null }>` — lekcja tylko gdy odblokowana (fail-closed).
  - `getProgressData(payload, user, ctx): Promise<{ checkins: CheckinRow[]; completedDays: number[]; measurements: CourseMeasurement[]; streak: number; completion: ReturnType<typeof completionStatus> }>`

- [ ] **Step 1: Failing test — fake payload + kluczowe scenariusze**

```ts
// src/utilities/cohortActions.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { completeLessonAction, saveCheckinAction, type CohortContext } from './cohortActions'

// Minimalny fake Payload Local API: kolekcje w Mapach, find po where equals.
function fakePayload() {
  const rows: Record<string, Record<string, unknown>[]> = {
    checkins: [],
    'lesson-progress': [],
    lessons: [{ id: 100, program: 7, nr: 5, slug: 'dzien-5' }],
  }
  let nextId = 1000
  return {
    rows,
    find: vi.fn(async ({ collection, where }: { collection: string; where?: unknown }) => {
      const all = rows[collection] ?? []
      const w = JSON.stringify(where ?? {})
      const docs = all.filter((r) => {
        // wystarczające dla testów: dopasuj wszystkie pary equals z where
        const eqs = [...w.matchAll(/"(\w+)":\{"equals":("?[^"}]*"?)\}/g)]
        return eqs.every(([, k, v]) => String(r[k]) === JSON.parse(v.startsWith('"') ? v : `"${v}"`).toString())
      })
      return { docs, totalDocs: docs.length }
    }),
    create: vi.fn(async ({ collection, data }: { collection: string; data: Record<string, unknown> }) => {
      // symulacja unikalnych indeksów: (user,program,date) i (user,lesson)
      const dupCheckin =
        collection === 'checkins' &&
        rows.checkins.some((r) => r.user === data.user && r.program === data.program && r.date === data.date)
      const dupProgress =
        collection === 'lesson-progress' &&
        rows['lesson-progress'].some((r) => r.user === data.user && r.lesson === data.lesson)
      if (dupCheckin || dupProgress) throw new Error('duplicate key')
      const doc = { id: nextId++, ...data }
      rows[collection].push(doc)
      return doc
    }),
    update: vi.fn(async ({ collection, id, data }: { collection: string; id: number; data: Record<string, unknown> }) => {
      const row = rows[collection].find((r) => r.id === id)
      Object.assign(row ?? {}, data)
      return row
    }),
  }
}

const ctx = (over: Partial<CohortContext> = {}): CohortContext =>
  ({
    program: {
      id: 7,
      deliveryMode: 'cohort',
      cohortConfig: {
        programLength: 60,
        unlockHour: 6,
        timezone: 'Europe/Warsaw',
        checkinFields: [{ key: 'steps', fieldType: 'number', min: 0, max: 100000 }],
        completion: { minimumDaysTarget: 48 },
      },
    },
    cohort: { id: 2, startDate: '2026-07-01' },
    clock: { startDate: '2026-07-01', unlockHour: 6, timezone: 'Europe/Warsaw', programLength: 60 },
    isAdmin: false,
    ...over,
  }) as never

const user = { id: 1, roles: ['customer'] } as never

describe('saveCheckinAction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-05T12:00:00Z')) // dzień 5, po 6:00
  })

  it('zapisuje dzisiejszy check-in, auto-ukańcza lekcję dnia, zwraca streak', async () => {
    const p = fakePayload()
    const res = await saveCheckinAction(p as never, user, ctx(), {
      date: '2026-07-05',
      minimumDone: true,
      values: { steps: 9000 },
    })
    expect(res).toMatchObject({ ok: true, streak: 1, programDay: 5 })
    expect(p.rows.checkins).toHaveLength(1)
    expect(p.rows['lesson-progress']).toHaveLength(1) // lekcja nr 5 auto-ukończona
  })

  it('odrzuca dzień poza oknem dziś/wczoraj', async () => {
    const res = await saveCheckinAction(fakePayload() as never, user, ctx(), {
      date: '2026-07-01',
      minimumDone: true,
    })
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('wczorajszy backfill NIE auto-ukańcza lekcji', async () => {
    const p = fakePayload()
    const res = await saveCheckinAction(p as never, user, ctx(), { date: '2026-07-04', minimumDone: true })
    expect(res).toMatchObject({ ok: true })
    expect(p.rows['lesson-progress']).toHaveLength(0)
  })

  it('drugi zapis tego samego dnia to update (upsert), nie duplikat', async () => {
    const p = fakePayload()
    await saveCheckinAction(p as never, user, ctx(), { date: '2026-07-05', minimumDone: false })
    await saveCheckinAction(p as never, user, ctx(), { date: '2026-07-05', minimumDone: true })
    expect(p.rows.checkins).toHaveLength(1)
    expect(p.rows.checkins[0].minimumDone).toBe(true)
  })

  it('odrzuca values niezgodne z configiem', async () => {
    const res = await saveCheckinAction(fakePayload() as never, user, ctx(), {
      date: '2026-07-05',
      minimumDone: true,
      values: { hack: 1 },
    })
    expect(res).toMatchObject({ ok: false, status: 400 })
  })
})

describe('completeLessonAction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-05T12:00:00Z'))
  })

  it('ukańcza odblokowaną lekcję; zablokowaną odrzuca; admin omija', async () => {
    const p = fakePayload()
    expect(await completeLessonAction(p as never, user, ctx(), 5)).toMatchObject({ ok: true })
    expect(await completeLessonAction(p as never, user, ctx(), 6)).toMatchObject({ ok: false, status: 403 })
    p.rows.lessons.push({ id: 101, program: 7, nr: 6, slug: 'dzien-6' })
    expect(await completeLessonAction(p as never, user, ctx({ isAdmin: true }), 6)).toMatchObject({ ok: true })
  })

  it('idempotentne przy podwójnym wywołaniu', async () => {
    const p = fakePayload()
    await completeLessonAction(p as never, user, ctx(), 5)
    expect(await completeLessonAction(p as never, user, ctx(), 5)).toMatchObject({ ok: true })
    expect(p.rows['lesson-progress']).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Uruchom — FAIL** — `pnpm exec vitest run src/utilities/cohortActions.test.ts`

- [ ] **Step 3: Implementacja**

```ts
// src/utilities/cohortActions.ts
// Logika domenowa trybu kohortowego — JEDYNE miejsce z regułami zapisu.
// Konsumenci: route'y HTTP (/api/courses/*) i narzędzia MCP uczestnika.
// Każda funkcja bierze `user` z sesji/klucza (BOLA) — nigdy z inputu.
import type { BasePayload } from 'payload'
import type { Checkin, Cohort, CourseMeasurement, Lesson, Program, User } from '@/payload-types'
import { clockFor, cohortMembership } from './cohortClock'
import {
  canWriteCheckin,
  isUnlocked,
  maxUnlockedDay,
  programDay as programDayOf,
  todayInTz,
  unlockAt,
  type CohortClock,
} from './cohortUnlock'
import { completionStatus, minimumStreak, type CheckinRow } from './cohortProgress'
import { validateCheckinValues, validateMeasurementValues, type FieldDef, type MetricDef } from './checkinValues'
import { isEnrolled } from './courseProgress'

export type CohortContext = { program: Program; cohort: Cohort; clock: CohortClock; isAdmin: boolean }
type Fail = { ok: false; error: string; status: number }
const forbidden: Fail = { ok: false, error: 'forbidden', status: 403 }

export async function resolveCohortContext(
  payload: BasePayload,
  user: User,
  programSlug: string,
): Promise<CohortContext | Fail> {
  const res = await payload.find({
    collection: 'program',
    where: { slug: { equals: programSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const program = res.docs[0]
  if (!program || program.deliveryMode !== 'cohort') return forbidden
  const isAdmin = Array.isArray(user.roles) && user.roles.includes('admin')
  if (!isAdmin && !isEnrolled(user, program.id)) return forbidden
  const membership = await cohortMembership(payload, user.id, program.id)
  if (!membership) return { ok: false, error: 'Brak przypisanej kohorty — poproś o przypisanie', status: 409 }
  const clock = clockFor(program, membership.cohort)
  if (!clock) return forbidden // niekompletna konfiguracja → fail-closed
  return { program, cohort: membership.cohort, clock, isAdmin }
}

async function findLessonByDay(payload: BasePayload, programId: number, day: number): Promise<Lesson | null> {
  const res = await payload.find({
    collection: 'lessons',
    where: { and: [{ program: { equals: programId } }, { nr: { equals: day } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return (res.docs[0] as Lesson) ?? null
}

// Idempotentny wpis ukończenia (unikalny indeks user+lesson łapie wyścig).
async function upsertCompletion(payload: BasePayload, userId: number, lesson: Lesson, programId: number) {
  try {
    await payload.create({
      collection: 'lesson-progress',
      data: { user: userId, lesson: lesson.id, program: programId, completedAt: new Date().toISOString() },
      overrideAccess: true,
    })
  } catch {
    // duplikat (user, lesson) → już ukończona — no-op
  }
}

async function userCheckins(payload: BasePayload, userId: number, programId: number): Promise<Checkin[]> {
  const res = await payload.find({
    collection: 'checkins',
    where: { and: [{ user: { equals: userId } }, { program: { equals: programId } }] },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })
  return res.docs as Checkin[]
}

const asRows = (checkins: Checkin[]): CheckinRow[] =>
  checkins.map((c) => ({ date: c.date, minimumDone: !!c.minimumDone, values: (c.values as never) ?? {} }))

export async function saveCheckinAction(
  payload: BasePayload,
  user: User,
  ctx: CohortContext,
  input: { date: string; minimumDone: boolean; note?: string; values?: unknown },
): Promise<{ ok: true; streak: number; programDay: number } | Fail> {
  const { clock, program } = ctx
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(input.date)))
    return { ok: false, error: 'Nieprawidłowa data', status: 400 }
  if (!canWriteCheckin(input.date, clock))
    return { ok: false, error: 'Ten dzień jest już zamknięty. Nie nadrabiasz — wracasz.', status: 400 }
  if (typeof input.note === 'string' && input.note.length > 2000)
    return { ok: false, error: 'Notatka do 2000 znaków', status: 400 }

  const fields = (program.cohortConfig?.checkinFields ?? []) as unknown as FieldDef[]
  const validated = validateCheckinValues(fields, input.values)
  if (!validated.ok) return { ok: false, error: validated.error, status: 400 }

  const day = programDayOf(clock, new Date(`${input.date}T12:00:00Z`))
  const existing = await payload.find({
    collection: 'checkins',
    where: {
      and: [{ user: { equals: user.id } }, { program: { equals: program.id } }, { date: { equals: input.date } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const data = {
    user: user.id,
    program: program.id,
    date: input.date,
    programDay: day,
    minimumDone: input.minimumDone,
    note: input.note ?? '',
    values: validated.values,
  }
  const row = existing.docs[0]
  if (row) {
    await payload.update({ collection: 'checkins', id: row.id, data, overrideAccess: true })
  } else {
    try {
      await payload.create({ collection: 'checkins', data, overrideAccess: true })
    } catch {
      // wyścig na unikalnym (user, program, date): równoległy request utworzył
      // wiersz — ponów jako update
      const again = await payload.find({
        collection: 'checkins',
        where: {
          and: [{ user: { equals: user.id } }, { program: { equals: program.id } }, { date: { equals: input.date } }],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (again.docs[0]) await payload.update({ collection: 'checkins', id: again.docs[0].id, data, overrideAccess: true })
    }
  }

  // Auto-ukończenie TYLKO dzisiejszej, odblokowanej lekcji przy minimum. Backfill
  // wczoraj nie ukańcza; nic nigdy nie od-ukańcza.
  if (input.minimumDone && input.date === todayInTz(clock) && isUnlocked(day, clock, new Date(), ctx.isAdmin)) {
    const lesson = await findLessonByDay(payload, program.id, day)
    if (lesson) await upsertCompletion(payload, user.id, lesson, program.id)
  }

  const all = await userCheckins(payload, user.id, program.id)
  return { ok: true, streak: minimumStreak(asRows(all), todayInTz(clock)), programDay: day }
}

export async function saveMeasurementAction(
  payload: BasePayload,
  user: User,
  ctx: CohortContext,
  input: { point: string; values: unknown },
): Promise<{ ok: true } | Fail> {
  const cfg = ctx.program.cohortConfig
  const points = (cfg?.measurementPoints ?? []).map((p) => p.key)
  if (!points.includes(input.point)) return { ok: false, error: 'Nieznany punkt pomiaru', status: 400 }
  const metrics = (cfg?.measurementMetrics ?? []) as unknown as MetricDef[]
  const validated = validateMeasurementValues(metrics, input.values)
  if (!validated.ok) return { ok: false, error: validated.error, status: 400 }

  const existing = await payload.find({
    collection: 'course-measurements',
    where: {
      and: [{ user: { equals: user.id } }, { program: { equals: ctx.program.id } }, { point: { equals: input.point } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const data = {
    user: user.id,
    program: ctx.program.id,
    point: input.point,
    values: validated.values,
    recordedAt: new Date().toISOString(),
  }
  const row = existing.docs[0]
  if (row) await payload.update({ collection: 'course-measurements', id: row.id, data, overrideAccess: true })
  else
    try {
      await payload.create({ collection: 'course-measurements', data, overrideAccess: true })
    } catch {
      // wyścig na unikalnym (user, program, point) — wiersz już jest, pomiar
      // z równoległego requestu wygrał; no-op
    }
  return { ok: true }
}

export async function completeLessonAction(
  payload: BasePayload,
  user: User,
  ctx: CohortContext,
  day: number,
): Promise<{ ok: true } | Fail> {
  if (!Number.isInteger(day)) return { ok: false, error: 'Nieprawidłowy dzień', status: 400 }
  if (!isUnlocked(day, ctx.clock, new Date(), ctx.isAdmin))
    return { ok: false, error: 'Lekcja jeszcze zablokowana', status: 403 }
  const lesson = await findLessonByDay(payload, ctx.program.id, day)
  if (!lesson) return { ok: false, error: 'not found', status: 404 }
  await upsertCompletion(payload, user.id, lesson, ctx.program.id)
  return { ok: true }
}

export async function getTodayData(payload: BasePayload, user: User, ctx: CohortContext) {
  const { clock } = ctx
  const day = programDayOf(clock)
  const today = todayInTz(clock)
  const all = await userCheckins(payload, user.id, ctx.program.id)
  const streak = minimumStreak(asRows(all), today)
  const todayCheckin = (all.find((c) => c.date === today) as Checkin) ?? null
  const state = day < 1 ? ('before' as const) : day > clock.programLength ? ('after' as const) : ('active' as const)
  let lesson: Lesson | null = null
  let unlocksAt: string | null = null
  if (state === 'active') {
    if (isUnlocked(day, clock, new Date(), ctx.isAdmin)) lesson = await findLessonByDay(payload, ctx.program.id, day)
    else unlocksAt = unlockAt(day, clock).toISOString()
  }
  return { programDay: day, state, streak, todayCheckin, lesson, unlocksAt }
}

export async function getProgressData(payload: BasePayload, user: User, ctx: CohortContext) {
  const all = await userCheckins(payload, user.id, ctx.program.id)
  const rows = asRows(all)
  const completedRes = await payload.find({
    collection: 'lesson-progress',
    where: { and: [{ user: { equals: user.id } }, { program: { equals: ctx.program.id } }] },
    limit: 0,
    depth: 1,
    overrideAccess: true,
  })
  const completedDays = completedRes.docs
    .map((r) => (typeof r.lesson === 'object' && r.lesson ? (r.lesson as Lesson).nr : null))
    .filter((n): n is number => typeof n === 'number')
  const measurementsRes = await payload.find({
    collection: 'course-measurements',
    where: { and: [{ user: { equals: user.id } }, { program: { equals: ctx.program.id } }] },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })
  const completionCfg = ctx.program.cohortConfig?.completion
  const completion = completionStatus(rows, {
    minimumDaysTarget: completionCfg?.minimumDaysTarget ?? 0,
    extraTargets: (completionCfg?.extraTargets ?? []).map((t) => ({
      label: t.label,
      fieldKey: t.fieldKey,
      matchValues: (t.matchValues ?? []) as string[],
      target: t.target,
    })),
  })
  return {
    checkins: rows,
    completedDays,
    measurements: measurementsRes.docs as CourseMeasurement[],
    streak: minimumStreak(rows, todayInTz(ctx.clock)),
    completion,
  }
}
```

- [ ] **Step 4: Testy zielone** — `pnpm exec vitest run src/utilities/cohortActions.test.ts` → PASS

- [ ] **Step 5: Commit**

```bash
git add src/utilities/cohortActions.ts src/utilities/cohortActions.test.ts
git commit -m "feat(cohort): cohortActions — wspólna logika domenowa dla HTTP i MCP"
```

---

### Task 7: Route'y `checkin` + `measurement` (cienkie wrappery)

**Files:**
- Create: `src/app/(frontend)/api/courses/checkin/route.ts`
- Create: `src/app/(frontend)/api/courses/measurement/route.ts`
- Test: `src/security/cohortRoutes.test.ts`

**Interfaces:**
- Consumes: `resolveCohortContext`, `saveCheckinAction`, `saveMeasurementAction` (Task 6).
- Produces: `POST /api/courses/checkin` body `{ programSlug, date, minimumDone, note?, values? }` → `{ ok, streak, programDay }` | `{ error }`; `POST /api/courses/measurement` body `{ programSlug, point, values }` → `{ ok }` | `{ error }`. Konsumowane przez UI (Task 11/12) i różne od MCP (Task 14), które woła bezpośrednio akcje.

- [ ] **Step 1: Failing test** — wzór mockowania jak w istniejących testach route'ów (`src/app/(frontend)/api/apps/checkout/checkout.test.ts`): mock `payload`/`getPayload` + `next/headers`, wywołanie `POST(new Request(...))`.

```ts
// src/security/cohortRoutes.test.ts
// Granice zaufania route'ów kohortowych: auth wymagany, userId z sesji,
// jednolite 403 dla nie-zapisanych, walidacja body.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.fn()
const resolveCohortContext = vi.fn()
const saveCheckinAction = vi.fn()
const saveMeasurementAction = vi.fn()

vi.mock('payload', () => ({ getPayload: async () => ({ auth }) }))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/utilities/cohortActions', () => ({
  resolveCohortContext: (...a: unknown[]) => resolveCohortContext(...a),
  saveCheckinAction: (...a: unknown[]) => saveCheckinAction(...a),
  saveMeasurementAction: (...a: unknown[]) => saveMeasurementAction(...a),
}))

const { POST: checkinPOST } = await import('@/app/(frontend)/api/courses/checkin/route')
const { POST: measurementPOST } = await import('@/app/(frontend)/api/courses/measurement/route')

const req = (body: unknown) =>
  new Request('http://x/api/courses/checkin', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1, roles: ['customer'] } })
  resolveCohortContext.mockResolvedValue({ program: { id: 7 }, clock: {}, isAdmin: false })
})

describe('POST /api/courses/checkin', () => {
  it('401 bez sesji', async () => {
    auth.mockResolvedValue({ user: null })
    const res = await checkinPOST(req({ programSlug: 'x', date: '2026-07-05', minimumDone: true }) as never)
    expect(res.status).toBe(401)
  })
  it('400 na złym body (brak minimumDone / złe typy)', async () => {
    expect((await checkinPOST(req({ programSlug: 'x', date: '2026-07-05' }) as never)).status).toBe(400)
    expect((await checkinPOST(req('nie-json-obiekt') as never)).status).toBe(400)
  })
  it('status z resolveCohortContext propagowany (403 forbidden)', async () => {
    resolveCohortContext.mockResolvedValue({ ok: false, error: 'forbidden', status: 403 })
    const res = await checkinPOST(req({ programSlug: 'x', date: '2026-07-05', minimumDone: true }) as never)
    expect(res.status).toBe(403)
  })
  it('happy path: przekazuje input do akcji, zwraca streak; userId NIE pochodzi z body', async () => {
    saveCheckinAction.mockResolvedValue({ ok: true, streak: 3, programDay: 5 })
    const res = await checkinPOST(
      req({ programSlug: 'x', date: '2026-07-05', minimumDone: true, user: 999 }) as never,
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, streak: 3 })
    // drugi argument akcji to user Z SESJI (id 1), nie z body
    expect(saveCheckinAction.mock.calls[0][1]).toMatchObject({ id: 1 })
  })
})

describe('POST /api/courses/measurement', () => {
  it('walidacja body i propagacja statusów jak w checkin', async () => {
    saveMeasurementAction.mockResolvedValue({ ok: true })
    const res = await measurementPOST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ programSlug: 'x', point: 'D0', values: {} }) }) as never,
    )
    expect(res.status).toBe(200)
    expect((await measurementPOST(new Request('http://x', { method: 'POST', body: '{}' }) as never)).status).toBe(400)
  })
})
```

- [ ] **Step 2: Uruchom — FAIL** — `pnpm exec vitest run src/security/cohortRoutes.test.ts`

- [ ] **Step 3: Implementacja**

```ts
// src/app/(frontend)/api/courses/checkin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { resolveCohortContext, saveCheckinAction } from '@/utilities/cohortActions'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null) return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  const { programSlug, date, minimumDone, note, values } = body as Record<string, unknown>
  if (
    typeof programSlug !== 'string' ||
    typeof date !== 'string' ||
    typeof minimumDone !== 'boolean' ||
    (note !== undefined && typeof note !== 'string')
  )
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await nextHeaders() })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const ctx = await resolveCohortContext(payload, user, programSlug)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const result = await saveCheckinAction(payload, user, ctx, { date, minimumDone, note, values })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
}

export const dynamic = 'force-dynamic'
```

```ts
// src/app/(frontend)/api/courses/measurement/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { resolveCohortContext, saveMeasurementAction } from '@/utilities/cohortActions'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null) return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  const { programSlug, point, values } = body as Record<string, unknown>
  if (typeof programSlug !== 'string' || typeof point !== 'string')
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await nextHeaders() })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const ctx = await resolveCohortContext(payload, user, programSlug)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const result = await saveMeasurementAction(payload, user, ctx, { point, values })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
}

export const dynamic = 'force-dynamic'
```

- [ ] **Step 4: Testy zielone** — `pnpm exec vitest run src/security/cohortRoutes.test.ts` → PASS

- [ ] **Step 5: Commit**

```bash
git add "src/app/(frontend)/api/courses/checkin" "src/app/(frontend)/api/courses/measurement" src/security/cohortRoutes.test.ts
git commit -m "feat(cohort): route'y checkin + measurement"
```

---

### Task 8: Webhook — auto-przypisanie do kohorty + revoke przy refundzie

**Files:**
- Create: `src/utilities/cohortAssign.ts`
- Test: `src/utilities/cohortAssign.test.ts`
- Modify: `src/app/(frontend)/api/stripe/webhook/route.ts` (gałąź programów: po `payload.update` z `purchases` ~linia 277; gałąź `charge.refunded`)

**Interfaces:**
- Consumes: `dateInTz` (Task 1); kolekcje `cohorts`, `cohort-members` (Task 3).
- Produces: `assignToCohortIfCohortProgram(payload, userId: number, programId: number): Promise<'assigned' | 'already' | 'no-cohort' | 'not-cohort'>`, `removeCohortMembership(payload, userId: number, programId: number): Promise<void>`.

- [ ] **Step 1: Failing test**

```ts
// src/utilities/cohortAssign.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assignToCohortIfCohortProgram } from './cohortAssign'

function fakePayload({ program, cohorts }: { program: unknown; cohorts: unknown[] }) {
  const created: unknown[] = []
  return {
    created,
    findByID: vi.fn(async () => program),
    find: vi.fn(async ({ collection, where, sort }: Record<string, unknown>) => {
      if (collection !== 'cohorts') return { docs: [] }
      // upcoming: where zawiera greater_than_equal → filtruj po startDate
      const w = JSON.stringify(where)
      let docs = [...cohorts] as { startDate: string }[]
      const m = w.match(/"greater_than_equal":"([^"]+)"/)
      if (m) docs = docs.filter((c) => c.startDate >= m[1])
      docs.sort((a, b) => (sort === '-startDate' ? b.startDate.localeCompare(a.startDate) : a.startDate.localeCompare(b.startDate)))
      return { docs: docs.slice(0, 1) }
    }),
    create: vi.fn(async ({ data }: { data: unknown }) => {
      created.push(data)
      return data
    }),
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-10T12:00:00Z'))
})

describe('assignToCohortIfCohortProgram', () => {
  const cohortProgram = { id: 7, deliveryMode: 'cohort', cohortConfig: { timezone: 'Europe/Warsaw' } }

  it('program self-paced → not-cohort, nic nie tworzy', async () => {
    const p = fakePayload({ program: { id: 3, deliveryMode: 'self-paced' }, cohorts: [] })
    expect(await assignToCohortIfCohortProgram(p as never, 1, 3)).toBe('not-cohort')
    expect(p.created).toHaveLength(0)
  })

  it('wybiera najbliższą PRZYSZŁĄ kohortę', async () => {
    const p = fakePayload({
      program: cohortProgram,
      cohorts: [
        { id: 1, startDate: '2026-06-01' },
        { id: 2, startDate: '2026-08-01' },
        { id: 3, startDate: '2026-09-01' },
      ],
    })
    expect(await assignToCohortIfCohortProgram(p as never, 1, 7)).toBe('assigned')
    expect((p.created[0] as { cohort: number }).cohort).toBe(2)
  })

  it('brak przyszłych → ostatnia (najpóźniejszy start)', async () => {
    const p = fakePayload({
      program: cohortProgram,
      cohorts: [
        { id: 1, startDate: '2026-05-01' },
        { id: 2, startDate: '2026-06-01' },
      ],
    })
    await assignToCohortIfCohortProgram(p as never, 1, 7)
    expect((p.created[0] as { cohort: number }).cohort).toBe(2)
  })

  it('zero kohort → no-cohort; duplikat membershipu → already', async () => {
    const none = fakePayload({ program: cohortProgram, cohorts: [] })
    expect(await assignToCohortIfCohortProgram(none as never, 1, 7)).toBe('no-cohort')
    const dup = fakePayload({ program: cohortProgram, cohorts: [{ id: 1, startDate: '2026-08-01' }] })
    dup.create.mockRejectedValue(new Error('duplicate key'))
    expect(await assignToCohortIfCohortProgram(dup as never, 1, 7)).toBe('already')
  })
})
```

- [ ] **Step 2: Uruchom — FAIL** — `pnpm exec vitest run src/utilities/cohortAssign.test.ts`

- [ ] **Step 3: Implementacja**

```ts
// src/utilities/cohortAssign.ts
// Przypisanie kupującego do kohorty po opłaconym checkoutcie (webhook) i
// zdjęcie membershipu przy refundzie. Wybór kohorty: najbliższa przyszła,
// fallback ostatnia; brak kohort → informacja dla admina (mail sprzedażowy).
import type { BasePayload } from 'payload'
import { dateInTz } from './cohortUnlock'

export async function assignToCohortIfCohortProgram(
  payload: BasePayload,
  userId: number,
  programId: number,
): Promise<'assigned' | 'already' | 'no-cohort' | 'not-cohort'> {
  const program = await payload.findByID({ collection: 'program', id: programId, depth: 0, overrideAccess: true })
  if (program.deliveryMode !== 'cohort') return 'not-cohort'
  const tz = program.cohortConfig?.timezone || 'Europe/Warsaw'
  const today = dateInTz(new Date(), tz)
  const upcoming = await payload.find({
    collection: 'cohorts',
    where: { and: [{ program: { equals: programId } }, { startDate: { greater_than_equal: today } }] },
    sort: 'startDate',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  let cohort = upcoming.docs[0]
  if (!cohort) {
    const latest = await payload.find({
      collection: 'cohorts',
      where: { program: { equals: programId } },
      sort: '-startDate',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    cohort = latest.docs[0]
  }
  if (!cohort) return 'no-cohort'
  try {
    await payload.create({
      collection: 'cohort-members',
      data: { user: userId, cohort: cohort.id, program: programId, joinedAt: new Date().toISOString() },
      overrideAccess: true,
    })
  } catch {
    // unikalny (user, program) → już przypisany (re-delivery webhooka)
    return 'already'
  }
  return 'assigned'
}

export async function removeCohortMembership(payload: BasePayload, userId: number, programId: number): Promise<void> {
  const res = await payload.find({
    collection: 'cohort-members',
    where: { and: [{ user: { equals: userId } }, { program: { equals: programId } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const row = res.docs[0]
  if (row) await payload.delete({ collection: 'cohort-members', id: row.id, overrideAccess: true }).catch(() => {})
}
```

- [ ] **Step 4: Wpięcie w webhook** — w `src/app/(frontend)/api/stripe/webhook/route.ts`:

W gałęzi programów, bezpośrednio PO `payload.update({ collection: 'users', ... purchases ... })` (za ~linią 277), a PRZED `notifyEvent` (grant pozostaje krytycznym, pierwszym efektem):

```ts
      // Tryb kohortowy: przypisz do najbliższej kohorty (idempotentne — unikalny
      // indeks łapie re-delivery). Best-effort: brak kohorty nie blokuje grantu.
      const { assignToCohortIfCohortProgram } = await import('@/utilities/cohortAssign')
      const cohortResult = await assignToCohortIfCohortProgram(payload, user.id, programId as number).catch(
        () => 'error' as const,
      )
      if (cohortResult === 'no-cohort')
        console.error(`[stripe webhook] program ${programIdRaw}: brak kohorty do przypisania dla ${email}`)
```

oraz w istniejącej gałęzi `charge.refunded` dla programów, obok zdjęcia programu z `purchases`:

```ts
      const { removeCohortMembership } = await import('@/utilities/cohortAssign')
      await removeCohortMembership(payload, user.id, programId as number).catch(() => {})
```

- [ ] **Step 5: Testy zielone (nowe + istniejące webhookowe)**

Run: `pnpm exec vitest run src/utilities/cohortAssign.test.ts src/security`
Expected: PASS (istniejące testy webhooka w `src/security/` nadal zielone — mock `payload.findByID` dla `program` może wymagać dodania `deliveryMode: 'self-paced'` do fixture)

- [ ] **Step 6: Commit**

```bash
git add src/utilities/cohortAssign.ts src/utilities/cohortAssign.test.ts "src/app/(frontend)/api/stripe/webhook/route.ts"
git commit -m "feat(cohort): auto-przypisanie do kohorty w webhooku + revoke przy refundzie"
```

---

### Task 9: Invite'y — join flow + atomowe zużycie + mail Brevo

**Files:**
- Create: `src/app/(frontend)/api/courses/join/route.ts`
- Create: `src/app/courses-app/join/[token]/page.tsx`
- Create: `src/app/courses-app/join/[token]/JoinForm.tsx`
- Modify: `src/collections/CourseInvites.ts` (hook afterChange — mail)
- Test: `src/security/courseInvites.test.ts`

**Interfaces:**
- Consumes: kolekcja `course-invites` (Task 3), `assignToCohortIfCohortProgram` NIE — invite niesie kohortę wprost; `addProgramToPurchases` z `@/utilities/purchases`; `sendTransactionalEmail` z `@/utilities/brevo`.
- Produces: `POST /api/courses/join` body `{ token, name, password }` → `{ ok: true, email }` (klient loguje się przez istniejący `POST /api/users/login` Payloada i przekierowuje na `/account`); strona `/join/[token]` (na hoście courses).

- [ ] **Step 1: Failing test**

```ts
// src/security/courseInvites.test.ts
// Granice zaufania invite'ów: email TYLKO z invite'a, jednorazowość atomowa,
// expiry egzekwowane, jednolite błędy bez wycieku stanu.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.fn()
const find = vi.fn()
const create = vi.fn()
const update = vi.fn()
const drizzleExecute = vi.fn()

vi.mock('payload', () => ({
  getPayload: async () => ({ auth, find, create, update, db: { drizzle: { execute: drizzleExecute } } }),
}))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

const { POST } = await import('@/app/(frontend)/api/courses/join/route')

const validInvite = {
  id: 5,
  email: 'ojciec@example.com',
  program: 7,
  cohort: 2,
  token: 'tok-1',
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  usedAt: null,
}
const req = (body: unknown) => new Request('http://x/api/courses/join', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  vi.clearAllMocks()
  find.mockImplementation(async ({ collection }: { collection: string }) => {
    if (collection === 'course-invites') return { docs: [validInvite] }
    if (collection === 'users') return { docs: [] }
    return { docs: [] }
  })
  create.mockResolvedValue({ id: 42, email: validInvite.email })
  drizzleExecute.mockResolvedValue({ rows: [{ id: 5 }] }) // atomowy claim OK
})

describe('POST /api/courses/join', () => {
  it('400 na złym body (hasło < 10 znaków, brak name)', async () => {
    expect((await POST(req({ token: 't', name: 'A', password: 'krotkie' }) as never)).status).toBe(400)
    expect((await POST(req({ token: 't', password: 'wystarczajaco-dlugie' }) as never)).status).toBe(400)
  })

  it('nieznany / zużyty / przeterminowany token → jednolite 403 bez rozróżnienia w statusie', async () => {
    find.mockResolvedValue({ docs: [] })
    expect((await POST(req({ token: 'zly', name: 'A B', password: 'dlugie-haslo-123' }) as never)).status).toBe(403)
    find.mockResolvedValue({ docs: [{ ...validInvite, usedAt: '2026-07-01T00:00:00Z' }] })
    expect((await POST(req({ token: 'tok-1', name: 'A B', password: 'dlugie-haslo-123' }) as never)).status).toBe(403)
    find.mockResolvedValue({ docs: [{ ...validInvite, expiresAt: '2020-01-01T00:00:00Z' }] })
    expect((await POST(req({ token: 'tok-1', name: 'A B', password: 'dlugie-haslo-123' }) as never)).status).toBe(403)
  })

  it('happy path: user tworzony z emailem Z INVITE\'A (nie z body), purchases + membership, atomowy claim', async () => {
    const res = await POST(
      req({ token: 'tok-1', name: 'Jan K', password: 'dlugie-haslo-123', email: 'atakujacy@example.com' }) as never,
    )
    expect(res.status).toBe(200)
    const createdUser = create.mock.calls.find((c) => c[0].collection === 'users')?.[0].data
    expect(createdUser.email).toBe('ojciec@example.com') // NIGDY z body
    expect(createdUser.purchases).toEqual([7])
    const member = create.mock.calls.find((c) => c[0].collection === 'cohort-members')?.[0].data
    expect(member).toMatchObject({ user: 42, cohort: 2, program: 7 })
    expect(drizzleExecute).toHaveBeenCalled() // UPDATE ... WHERE used_at IS NULL
  })

  it('przegrany wyścig o token (0 wierszy z RETURNING) → 403', async () => {
    drizzleExecute.mockResolvedValue({ rows: [] })
    const res = await POST(req({ token: 'tok-1', name: 'Jan K', password: 'dlugie-haslo-123' }) as never)
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 2: Uruchom — FAIL** — `pnpm exec vitest run src/security/courseInvites.test.ts`

- [ ] **Step 3: Route**

```ts
// src/app/(frontend)/api/courses/join/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { addProgramToPurchases } from '@/utilities/purchases'

// Jednolita odmowa: nie zdradzamy czy token istnieje / był użyty / wygasł.
const denied = () => NextResponse.json({ error: 'Zaproszenie jest nieaktywne' }, { status: 403 })

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null) return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  const { token, name, password } = body as Record<string, unknown>
  if (typeof token !== 'string' || token.length < 10) return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  if (typeof name !== 'string' || name.trim().length < 1 || name.length > 100)
    return NextResponse.json({ error: 'Podaj imię (do 100 znaków)' }, { status: 400 })
  if (typeof password !== 'string' || password.length < 10)
    return NextResponse.json({ error: 'Hasło musi mieć co najmniej 10 znaków' }, { status: 400 })

  const payload = await getPayload({ config: configPromise })
  const res = await payload.find({
    collection: 'course-invites',
    where: { token: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const invite = res.docs[0]
  if (!invite || invite.usedAt || !invite.expiresAt || Date.parse(String(invite.expiresAt)) <= Date.now())
    return denied()

  const programId = typeof invite.program === 'object' && invite.program ? invite.program.id : (invite.program as number)
  const cohortId = typeof invite.cohort === 'object' && invite.cohort ? invite.cohort.id : (invite.cohort as number)
  // GRANICA ZAUFANIA: email pochodzi WYŁĄCZNIE z invite'a — nigdy z body.
  const email = invite.email

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })
  let user = existing.docs[0]
  if (!user) {
    user = await payload.create({
      collection: 'users',
      data: { email, password, name, roles: ['customer'], purchases: [programId] } as never,
      overrideAccess: true,
    })
  } else {
    // Konto już istnieje (np. kupione inne kursy) — dopisz program, hasła nie ruszamy.
    const purchases = addProgramToPurchases(user.purchases as never, programId as never)
    await payload.update({ collection: 'users', id: user.id, data: { purchases } as never, overrideAccess: true })
  }

  try {
    await payload.create({
      collection: 'cohort-members',
      data: { user: user.id, cohort: cohortId, program: programId, joinedAt: new Date().toISOString() },
      overrideAccess: true,
    })
  } catch {
    // unikalny (user, program) → już przypisany — no-op
  }

  // Atomowe zużycie tokenu: warunkowy UPDATE z RETURNING — dokładnie jeden
  // request wygrywa; przegrany wyścig = zaproszenie już skonsumowane.
  const claimed = (await payload.db.drizzle.execute(
    sql`UPDATE course_invites SET used_at = now() WHERE id = ${invite.id} AND used_at IS NULL RETURNING id`,
  )) as { rows: unknown[] }
  if (!claimed.rows.length) return denied()

  return NextResponse.json({ ok: true, email })
}

export const dynamic = 'force-dynamic'
```

Uwaga wykonawcza: jeśli `sql` nie eksportuje się z `@payloadcms/db-postgres`, użyj `import { sql } from 'drizzle-orm'` (dostępne transytywnie przez adapter; sprawdź, który import kompiluje `pnpm build`).

- [ ] **Step 4: Strona + formularz**

```tsx
// src/app/courses-app/join/[token]/page.tsx
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { JoinForm } from './JoinForm'

export const dynamic = 'force-dynamic'

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = await getPayload({ config: configPromise })
  const res = await payload.find({
    collection: 'course-invites',
    where: { token: { equals: token } },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  const invite = res.docs[0]
  const active = invite && !invite.usedAt && invite.expiresAt && Date.parse(String(invite.expiresAt)) > Date.now()
  const programTitle =
    invite && typeof invite.program === 'object' && invite.program ? invite.program.title : ''

  return (
    <main className="course-shell mx-auto max-w-md px-4 py-16">
      {active ? (
        <>
          <h1 className="text-2xl font-semibold">Dołącz do kursu {programTitle}</h1>
          <p className="mt-2 text-sm opacity-70">Konto zostanie założone dla: {invite.email}</p>
          <JoinForm token={token} />
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">Zaproszenie jest nieaktywne</h1>
          <p className="mt-2 text-sm opacity-70">Link wygasł albo został już użyty. Poproś o nowe zaproszenie.</p>
        </>
      )}
    </main>
  )
}
```

```tsx
// src/app/courses-app/join/[token]/JoinForm.tsx
'use client'
import { useState } from 'react'

export function JoinForm({ token }: { token: string }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await fetch('/api/courses/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Coś poszło nie tak — spróbuj ponownie')
      setBusy(false)
      return
    }
    // Konto gotowe → zaloguj istniejącym endpointem auth Payloada i wejdź do kursu.
    const login = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email, password }),
    })
    window.location.href = login.ok ? '/account' : '/login'
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Imię
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} className="course-input" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Hasło (min. 10 znaków)
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} className="course-input" />
      </label>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <button type="submit" disabled={busy} className="course-btn-primary">
        {busy ? 'Zakładam konto…' : 'Dołącz do kursu'}
      </button>
    </form>
  )
}
```

(Klasy `course-input` / `course-btn-primary` — jeśli nie istnieją w `course-theme.css`, użyj klas z istniejącego formularza logowania `src/app/courses-app/login/` — skopiuj dokładnie stamtąd.)

- [ ] **Step 5: Mail z zaproszeniem (afterChange w CourseInvites)**

W `src/collections/CourseInvites.ts` dodaj do `hooks`:

```ts
    afterChange: [
      async ({ doc, operation }) => {
        if (operation !== 'create') return
        // Best-effort: błąd wysyłki nie może zablokować utworzenia invite'a —
        // joinUrl i tak jest widoczny w adminie do ręcznego wysłania.
        try {
          const { sendTransactionalEmail } = await import('../utilities/brevo')
          const base = process.env.NEXT_PUBLIC_COURSES_URL ?? ''
          await sendTransactionalEmail({
            to: doc.email,
            subject: 'Twoje zaproszenie do kursu',
            html: `<p>Cześć!</p><p>Masz zaproszenie do kursu. Dołącz tutaj (link ważny 7 dni):</p><p><a href="${base}/join/${doc.token}">${base}/join/${doc.token}</a></p>`,
          })
        } catch (err) {
          console.error('[course-invites] wysyłka zaproszenia nie powiodła się:', err)
        }
      },
    ],
```

(Dopasuj argumenty do rzeczywistej sygnatury `sendTransactionalEmail` w `src/utilities/brevo.ts:10` — jeśli przyjmuje np. `toName`/`sender`, uzupełnij wg wzorca z `sendCourseAccessEmail`.)

- [ ] **Step 6: Testy zielone** — `pnpm exec vitest run src/security/courseInvites.test.ts` → PASS

- [ ] **Step 7: Commit**

```bash
git add "src/app/(frontend)/api/courses/join" src/app/courses-app/join src/collections/CourseInvites.ts src/security/courseInvites.test.ts
git commit -m "feat(cohort): invite'y — join flow z atomowym zużyciem tokenu + mail Brevo"
```

---

### Task 10: Player — gating UI (kłódki w sidebarze + ekran blokady)

**Files:**
- Modify: `src/app/courses-app/[slug]/learn/[lesson]/page.tsx`
- Modify: `src/app/courses-app/_components/LessonSidebar.tsx:10` (nowy prop)
- Modify: `src/app/courses-app/_components/LessonView.tsx` (przekazanie propa + pager pomija zablokowane)

**Interfaces:**
- Consumes: `resolveCohortContext` NIE (strona ma już program+usera) — użyj `cohortMembership` + `clockFor` (Task 5), `maxUnlockedDay`, `unlockLabel` (Task 1).
- Produces: `LessonSidebar` przyjmuje opcjonalny prop `maxUnlockedNr?: number | null` (null/undefined = tryb self-paced, bez zmian zachowania); `LessonView` przyjmuje i przekazuje ten sam prop.

- [ ] **Step 1: Server-side gate w page.tsx**

Po istniejącym enrollment-gate (linia ~50), a PRZED zapytaniem o lekcję, dodaj:

```ts
  // Tryb kohortowy: policz najwyższy odblokowany dzień. Zapytanie o lekcję niżej
  // (overrideAccess: false) i tak egzekwuje enrolledOrAdmin — ten blok służy
  // rozróżnieniu "zablokowana" (ekran blokady) od "nie istnieje" (404).
  let maxUnlockedNr: number | null = null
  if (program.deliveryMode === 'cohort' && !isAdmin) {
    const { cohortMembership, clockFor } = await import('@/utilities/cohortClock')
    const { maxUnlockedDay } = await import('@/utilities/cohortUnlock')
    const membership = await cohortMembership(payload, user.id, program.id)
    const clock = membership ? clockFor(program as Program, membership.cohort) : null
    if (!clock) redirect(getLocalizedPath(`/${slug}`, locale)) // brak kohorty/configu → syllabus
    maxUnlockedNr = maxUnlockedDay(clock)
  }
```

Zapytanie o lekcję zostaje bez zmian (`overrideAccess: false` + user — access z Task 5 odfiltruje zablokowane). Po `const lesson = found.docs[0]`, zamień `if (!lesson) notFound()` na:

```ts
  if (!lesson) {
    // Rozróżnij: lekcja istnieje, ale jest jeszcze zablokowana → ekran blokady.
    if (maxUnlockedNr !== null) {
      const meta = await payload.find({
        collection: 'lessons',
        where: { and: [{ program: { equals: program.id } }, { slug: { equals: lessonSlug } }] },
        limit: 1,
        overrideAccess: true,
        depth: 0,
        locale,
        select: { title: true, nr: true }, // METADANE — treść nie opuszcza serwera
      })
      const locked = meta.docs[0]
      if (locked && typeof locked.nr === 'number' && locked.nr > maxUnlockedNr) {
        const { unlockLabel } = await import('@/utilities/cohortUnlock')
        const { cohortMembership, clockFor } = await import('@/utilities/cohortClock')
        const membership = await cohortMembership(payload, user.id, program.id)
        const clock = membership ? clockFor(program as Program, membership.cohort) : null
        return (
          <main className="course-shell mx-auto max-w-xl px-4 py-24 text-center">
            <p className="text-4xl">🔒</p>
            <h1 className="mt-4 text-2xl font-semibold">{locked.title}</h1>
            <p className="mt-2 opacity-70">{clock ? unlockLabel(locked.nr, clock) : 'Lekcja jeszcze zablokowana'}</p>
            <a href={`/${slug}/dzisiaj`} className="course-btn-primary mt-8 inline-block">
              Wróć do dzisiejszego dnia
            </a>
          </main>
        )
      }
    }
    notFound()
  }
```

(Refaktor wykonawczy: policz `membership`/`clock` RAZ przed gate'em i użyj w obu miejscach — bez podwójnego zapytania.)

Na końcu przekaż prop: `<LessonView ... maxUnlockedNr={maxUnlockedNr} />`.

- [ ] **Step 2: LessonSidebar + LessonView**

W `LessonSidebar.tsx` dodaj do propsów `maxUnlockedNr?: number | null`. W renderze pozycji listy: gdy `maxUnlockedNr != null && typeof l.nr === 'number' && l.nr > maxUnlockedNr` → renderuj `<span>` zamiast `<Link>`, z ikoną kłódki (`Lock` z lucide-react — już używany dla hardGate) i klasą wyciszenia (np. `opacity-50 cursor-not-allowed`). W `LessonView.tsx`: przyjmij `maxUnlockedNr` i przekaż do `LessonSidebar`; w pagerze prev/next pomiń lekcje z `nr > maxUnlockedNr` (następna zablokowana → pokaż etykietę odblokowania zamiast linku, wzór labelki z pagera primal60: tekst `unlockLabel` w miejscu przycisku „Następna").

- [ ] **Step 3: Weryfikacja w przeglądarce (dowód)**

Run: `docker compose up -d && pnpm dev` → utwórz w adminie (http://localhost:3010/admin) testowy program `deliveryMode: cohort` (programLength 10, 3 lekcje nr 1-3), kohortę ze startem wczoraj, klienta testowego z purchase + membership (ręcznie w adminie). Zaloguj się jako klient: lekcja nr 1-2 dostępne, nr 3 → kłódka + „odblokuje się jutro o 6:00"; wejście bezpośrednim URL-em na nr 3 → ekran blokady. Zrzut ekranu obu stanów.

- [ ] **Step 4: Testy repo zielone** — `pnpm test:int` → PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/courses-app
git commit -m "feat(cohort): gating playera — kłódki, ekran blokady, pager bez zablokowanych"
```

---

### Task 11: Strona `/[slug]/dzisiaj` + formularz check-inu z configu

**Files:**
- Create: `src/app/courses-app/[slug]/dzisiaj/page.tsx`
- Create: `src/app/courses-app/_components/cohort/CheckinForm.tsx`
- Create: `src/app/courses-app/_components/cohort/StreakBar.tsx`
- Modify: `src/app/courses-app/account/page.tsx` (kurs kohortowy → link „Dzisiaj" zamiast „kontynuuj lekcję")

**Interfaces:**
- Consumes: `resolveCohortContext`, `getTodayData` (Task 6), `unlockLabel` (Task 1); `POST /api/courses/checkin` (Task 7).
- Produces: `CheckinForm({ programSlug, date, fields, minimumLabel, existing })` — client component; `fields` to zserializowany `cohortConfig.checkinFields` (bez funkcji), `existing` to dzisiejszy `Checkin | null`.

- [ ] **Step 1: Strona serwerowa**

```tsx
// src/app/courses-app/[slug]/dzisiaj/page.tsx
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { resolveCohortContext, getTodayData } from '@/utilities/cohortActions'
import { unlockLabel, yesterdayInTz, programDay as programDayOf } from '@/utilities/cohortUnlock'
import { CheckinForm } from '../../_components/cohort/CheckinForm'
import { StreakBar } from '../../_components/cohort/StreakBar'

export const dynamic = 'force-dynamic'

export default async function DzisiajPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect(`/login?next=${encodeURIComponent(`/${slug}/dzisiaj`)}`)

  const ctx = await resolveCohortContext(payload, user, slug)
  if ('error' in ctx) redirect(`/${slug}`) // paywall/syllabus — jednolicie, bez szczegółów

  const { programDay, state, streak, todayCheckin, lesson, unlocksAt } = await getTodayData(payload, user, ctx)
  const cfg = ctx.program.cohortConfig
  const fields = (cfg?.checkinFields ?? []).map((f) => ({
    key: f.key,
    label: f.label,
    fieldType: f.fieldType,
    min: f.min ?? null,
    max: f.max ?? null,
    options: (f.options ?? []).map((o) => ({ value: o.value, label: o.label })),
    section: f.section ?? null,
  }))

  if (state === 'before')
    return (
      <main className="course-shell mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">Startujemy {String(ctx.cohort.startDate).slice(0, 10)}</h1>
        <p className="mt-3 opacity-70">Twoja kohorta jeszcze nie wystartowała. Lekcja 1 odblokuje się w dniu startu o {cfg?.unlockHour ?? 6}:00.</p>
      </main>
    )

  if (state === 'after')
    return (
      <main className="course-shell mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">Program zakończony 🎉</h1>
        <p className="mt-3 opacity-70">Zobacz swoje wyniki i utrzymaj rytm.</p>
        <Link href={`/${slug}/postepy`} className="course-btn-primary mt-8 inline-block">Zobacz postępy</Link>
      </main>
    )

  const { clock } = ctx
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: clock.timezone }).format(new Date())
  const yesterday = yesterdayInTz(clock)
  const showYesterday = programDayOf(clock, new Date(`${yesterday}T12:00:00Z`)) >= 1

  return (
    <main className="course-shell mx-auto max-w-2xl px-4 py-10">
      <header>
        <p className="text-sm uppercase tracking-wide opacity-60">Dzień {programDay} z {clock.programLength}</p>
        <StreakBar streak={streak} />
      </header>

      <section className="mt-8">
        {lesson ? (
          <Link href={`/${slug}/learn/${lesson.slug}`} className="course-card block p-6">
            <p className="text-sm opacity-60">Lekcja dnia</p>
            <h2 className="mt-1 text-xl font-semibold">{lesson.title}</h2>
            <p className="mt-2 text-sm opacity-70">Otwórz lekcję →</p>
          </Link>
        ) : (
          <div className="course-card p-6 opacity-80">
            <p>🔒 {unlocksAt ? unlockLabel(programDay, clock) : 'Lekcja niedostępna'}</p>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Check-in — dziś</h2>
        <CheckinForm
          programSlug={slug}
          date={todayStr}
          fields={fields}
          minimumLabel={cfg?.minimumLabel ?? 'Zrobione minimum'}
          existing={todayCheckin}
        />
      </section>

      {showYesterday && !todayCheckin ? (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm opacity-70">Uzupełnij wczorajszy dzień</summary>
          <CheckinForm programSlug={slug} date={yesterday} fields={fields} minimumLabel={cfg?.minimumLabel ?? 'Zrobione minimum'} existing={null} />
        </details>
      ) : null}
    </main>
  )
}
```

(Uwaga wykonawcza: `showYesterday` w primal60 dodatkowo wymaga braku wczorajszego wpisu — pobierz wczorajszy check-in w `getTodayData` albo dodatkowym findem i ukryj `<details>` gdy istnieje. Klasy `course-card`/`course-shell` — użyj rzeczywistych klas z `course-theme.css`/istniejących komponentów.)

- [ ] **Step 2: CheckinForm (client)**

```tsx
// src/app/courses-app/_components/cohort/CheckinForm.tsx
'use client'
import { useState } from 'react'

type Field = {
  key: string
  label: string
  fieldType: 'boolean' | 'number' | 'select' | 'text'
  min: number | null
  max: number | null
  options: { value: string; label: string }[]
  section: string | null
}

export function CheckinForm({
  programSlug,
  date,
  fields,
  minimumLabel,
  existing,
}: {
  programSlug: string
  date: string
  fields: Field[]
  minimumLabel: string
  existing: { minimumDone?: boolean | null; note?: string | null; values?: Record<string, unknown> | null } | null
}) {
  const [minimumDone, setMinimumDone] = useState(!!existing?.minimumDone)
  const [note, setNote] = useState(existing?.note ?? '')
  const [values, setValues] = useState<Record<string, unknown>>((existing?.values as never) ?? {})
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (key: string, v: unknown) => setValues((prev) => ({ ...prev, [key]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const res = await fetch('/api/courses/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programSlug, date, minimumDone, note, values }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    setStatus(res.ok ? `Zapisane. ${data.streak} dni z minimum.` : (data.error ?? 'Nie udało się zapisać'))
  }

  // Sekcje wg field.section (null → sekcja domyślna), kolejność jak w configu
  const sections = new Map<string, Field[]>()
  for (const f of fields) {
    const s = f.section ?? ''
    sections.set(s, [...(sections.get(s) ?? []), f])
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-5">
      <label className="flex items-center gap-3 text-base font-medium">
        <input type="checkbox" checked={minimumDone} onChange={(e) => setMinimumDone(e.target.checked)} className="h-5 w-5" />
        {minimumLabel}
      </label>

      {[...sections.entries()].map(([section, fs]) => (
        <fieldset key={section || '_'} className="flex flex-col gap-3">
          {section ? <legend className="text-sm font-medium opacity-70">{section}</legend> : null}
          {fs.map((f) => (
            <label key={f.key} className="flex flex-col gap-1 text-sm">
              {f.label}
              {f.fieldType === 'boolean' ? (
                <input type="checkbox" checked={!!values[f.key]} onChange={(e) => set(f.key, e.target.checked)} className="h-4 w-4" />
              ) : f.fieldType === 'number' ? (
                <input
                  type="number"
                  value={values[f.key] == null ? '' : String(values[f.key])}
                  min={f.min ?? undefined}
                  max={f.max ?? undefined}
                  step="any"
                  onChange={(e) => set(f.key, e.target.value === '' ? null : Number(e.target.value))}
                  className="course-input"
                />
              ) : f.fieldType === 'select' ? (
                <select value={(values[f.key] as string) ?? ''} onChange={(e) => set(f.key, e.target.value || null)} className="course-input">
                  <option value="">—</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input value={(values[f.key] as string) ?? ''} maxLength={2000} onChange={(e) => set(f.key, e.target.value || null)} className="course-input" />
              )}
            </label>
          ))}
        </fieldset>
      ))}

      <label className="flex flex-col gap-1 text-sm">
        Notatka
        <textarea value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} rows={2} className="course-input" />
      </label>

      <button type="submit" disabled={busy} className="course-btn-primary self-start">
        {busy ? 'Zapisuję…' : 'Zapisz check-in'}
      </button>
      {status ? <p className="text-sm opacity-80">{status}</p> : null}
    </form>
  )
}
```

- [ ] **Step 3: StreakBar**

```tsx
// src/app/courses-app/_components/cohort/StreakBar.tsx
export function StreakBar({ streak }: { streak: number }) {
  const label = streak === 1 ? '1 dzień z minimum' : `${streak} dni z minimum`
  return (
    <p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold">
      <span aria-hidden>🔥</span> {label}
    </p>
  )
}
```

- [ ] **Step 4: Account — link „Dzisiaj"** — w `src/app/courses-app/account/page.tsx`, przy renderze karty kursu: gdy `program.deliveryMode === 'cohort'` → link `/${slug}/dzisiaj` z etykietą „Dzisiaj” zamiast dotychczasowego resume-linku.

- [ ] **Step 5: Weryfikacja w przeglądarce (dowód)** — na danych z Task 10: `/{slug}/dzisiaj` pokazuje dzień, streak, lekcję dnia i formularz z polami z configu; zapis check-inu z minimum → komunikat ze streakiem + lekcja dnia oznaczona jako ukończona w playerze. Zrzut ekranu.

- [ ] **Step 6: Commit**

```bash
git add src/app/courses-app
git commit -m "feat(cohort): strona Dzisiaj + generowany formularz check-inu + streak"
```

---

### Task 12: Strona `/[slug]/postepy` — ukończenie, heatmapa, pomiary, trendy

**Files:**
- Create: `src/app/courses-app/[slug]/postepy/page.tsx`
- Create: `src/app/courses-app/_components/cohort/CompletionCard.tsx`
- Create: `src/app/courses-app/_components/cohort/Heatmap.tsx`
- Create: `src/app/courses-app/_components/cohort/MeasurementForm.tsx`
- Create: `src/app/courses-app/_components/cohort/Sparkline.tsx`

**Interfaces:**
- Consumes: `resolveCohortContext`, `getProgressData` (Task 6), `weeklyAvg` (Task 2), `programDay` (Task 1); `POST /api/courses/measurement` (Task 7).
- Produces: komponenty prezentacyjne; `MeasurementForm({ programSlug, points, metrics, existing })` (client) — `existing`: mapa `point -> values`.

- [ ] **Step 1: Strona serwerowa**

```tsx
// src/app/courses-app/[slug]/postepy/page.tsx
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveCohortContext, getProgressData } from '@/utilities/cohortActions'
import { weeklyAvg } from '@/utilities/cohortProgress'
import { CompletionCard } from '../../_components/cohort/CompletionCard'
import { Heatmap } from '../../_components/cohort/Heatmap'
import { MeasurementForm } from '../../_components/cohort/MeasurementForm'
import { Sparkline } from '../../_components/cohort/Sparkline'

export const dynamic = 'force-dynamic'

export default async function PostepyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect(`/login?next=${encodeURIComponent(`/${slug}/postepy`)}`)

  const ctx = await resolveCohortContext(payload, user, slug)
  if ('error' in ctx) redirect(`/${slug}`)

  const { checkins, measurements, completion } = await getProgressData(payload, user, ctx)
  const cfg = ctx.program.cohortConfig
  const points = (cfg?.measurementPoints ?? []).map((p) => ({ key: p.key, label: p.label }))
  const metrics = (cfg?.measurementMetrics ?? []).map((m) => ({
    key: m.key, label: m.label, unit: m.unit ?? '', min: m.min ?? null, max: m.max ?? null,
  }))
  const existing: Record<string, Record<string, number>> = {}
  for (const m of measurements) existing[m.point] = (m.values as never) ?? {}

  // Trendy: każde numeryczne pole check-inu z >= 2 punktami danych
  const numericKeys = (cfg?.checkinFields ?? []).filter((f) => f.fieldType === 'number')
  const trends = numericKeys
    .map((f) => ({
      label: f.label,
      data: weeklyAvg(
        checkins
          .filter((c) => typeof c.values?.[f.key] === 'number')
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((c) => ({ date: c.date, value: c.values?.[f.key] as number })),
      ),
    }))
    .filter((t) => t.data.length >= 2)

  return (
    <main className="course-shell mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Postępy</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Konsekwencja</h2>
        <CompletionCard completion={completion} minimumDaysTarget={cfg?.completion?.minimumDaysTarget ?? 0} />
        <Heatmap checkins={checkins} programLength={ctx.clock.programLength} startDate={ctx.clock.startDate} />
      </section>

      {points.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Pomiary</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr>
                <th className="py-1 text-left font-medium opacity-60">Metryka</th>
                {points.map((p) => <th key={p.key} className="py-1 text-right font-medium opacity-60">{p.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.key} className="border-t border-current/10">
                  <td className="py-2">{m.label}{m.unit ? ` (${m.unit})` : ''}</td>
                  {points.map((p) => (
                    <td key={p.key} className="py-2 text-right tabular-nums">{existing[p.key]?.[m.key] ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm opacity-70">Dodaj / popraw pomiar</summary>
            <MeasurementForm programSlug={slug} points={points} metrics={metrics} existing={existing} />
          </details>
        </section>
      ) : null}

      {trends.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Trendy (średnia 7 dni)</h2>
          <div className="mt-3 grid gap-6 sm:grid-cols-2">
            {trends.map((t) => (
              <div key={t.label}>
                <p className="text-sm opacity-70">{t.label}</p>
                <Sparkline data={t.data} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
```

- [ ] **Step 2: Komponenty**

```tsx
// src/app/courses-app/_components/cohort/CompletionCard.tsx
type Completion = {
  minimumDays: number
  extras: { label?: string | null; count: number; target: number }[]
  done: boolean
}

function Bar({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  return (
    <div className="mt-3">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums">{value} / {target}</span>
      </div>
      <div className="mt-1 h-2 w-full rounded bg-current/10">
        <div className="h-2 rounded bg-amber-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function CompletionCard({ completion, minimumDaysTarget }: { completion: Completion; minimumDaysTarget: number }) {
  return (
    <div className="course-card mt-3 p-5">
      {completion.done ? <p className="font-semibold text-amber-500">Program ukończony ✓</p> : null}
      {minimumDaysTarget > 0 ? <Bar label="Dni z minimum" value={completion.minimumDays} target={minimumDaysTarget} /> : null}
      {completion.extras.map((e, i) => (
        <Bar key={i} label={e.label ?? 'Cel dodatkowy'} value={e.count} target={e.target} />
      ))}
    </div>
  )
}
```

```tsx
// src/app/courses-app/_components/cohort/Heatmap.tsx
import { datePlusDays } from '@/utilities/cohortUnlock'

// Siatka programLength dni (tygodnie jako wiersze): bursztyn = minimum,
// wyciszony = wpis bez minimum, pusty = brak wpisu.
export function Heatmap({
  checkins,
  programLength,
  startDate,
}: {
  checkins: { date: string; minimumDone: boolean }[]
  programLength: number
  startDate: string
}) {
  const byDate = new Map(checkins.map((c) => [c.date, c.minimumDone]))
  const cells = Array.from({ length: programLength }, (_, i) => {
    const date = datePlusDays(startDate, i)
    const entry = byDate.get(date)
    return { date, state: entry === true ? 'min' : entry === false ? 'entry' : 'none' }
  })
  return (
    <div className="mt-4 grid grid-cols-7 gap-1" style={{ maxWidth: '18rem' }}>
      {cells.map((c) => (
        <div
          key={c.date}
          title={c.date}
          className={`aspect-square rounded-sm ${
            c.state === 'min' ? 'bg-amber-500' : c.state === 'entry' ? 'bg-current/30' : 'bg-current/10'
          }`}
        />
      ))}
    </div>
  )
}
```

```tsx
// src/app/courses-app/_components/cohort/MeasurementForm.tsx
'use client'
import { useState } from 'react'

type Metric = { key: string; label: string; unit: string; min: number | null; max: number | null }

export function MeasurementForm({
  programSlug,
  points,
  metrics,
  existing,
}: {
  programSlug: string
  points: { key: string; label: string }[]
  metrics: Metric[]
  existing: Record<string, Record<string, number>>
}) {
  const [point, setPoint] = useState(points[0]?.key ?? '')
  const [values, setValues] = useState<Record<string, number | null>>(existing[point] ?? {})
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function switchPoint(p: string) {
    setPoint(p)
    setValues(existing[p] ?? {})
    setStatus(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v != null))
    const res = await fetch('/api/courses/measurement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programSlug, point, values: clean }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    setStatus(res.ok ? 'Zapisane.' : (data.error ?? 'Nie udało się zapisać'))
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
      <div className="flex gap-2">
        {points.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => switchPoint(p.key)}
            className={`course-chip ${p.key === point ? 'course-chip-active' : ''}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {metrics.map((m) => (
        <label key={m.key} className="flex flex-col gap-1 text-sm">
          {m.label}{m.unit ? ` (${m.unit})` : ''}
          <input
            type="number"
            step="any"
            min={m.min ?? undefined}
            max={m.max ?? undefined}
            value={values[m.key] == null ? '' : String(values[m.key])}
            onChange={(e) => setValues((prev) => ({ ...prev, [m.key]: e.target.value === '' ? null : Number(e.target.value) }))}
            className="course-input"
          />
        </label>
      ))}
      <button type="submit" disabled={busy} className="course-btn-primary self-start">
        {busy ? 'Zapisuję…' : 'Zapisz pomiar'}
      </button>
      {status ? <p className="text-sm opacity-80">{status}</p> : null}
    </form>
  )
}
```

```tsx
// src/app/courses-app/_components/cohort/Sparkline.tsx
// Inline SVG, bez bibliotek — 2+ punkty, skala min-max.
export function Sparkline({ data }: { data: { date: string; value: number }[] }) {
  const w = 240
  const h = 48
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = data
    .map((d, i) => `${(i / (data.length - 1)) * w},${h - 4 - ((d.value - min) / span) * (h - 8)}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 w-full" role="img" aria-label="wykres trendu">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <text x={w} y={12} textAnchor="end" className="text-[10px]" fill="currentColor" opacity="0.7">
        {values[values.length - 1]}
      </text>
    </svg>
  )
}
```

(Klasy `course-chip`/`course-chip-active` — jeśli brak w theme, użyj prostych klas przycisków z istniejących komponentów.)

- [ ] **Step 3: Weryfikacja w przeglądarce (dowód)** — po kilku zapisanych check-inach i jednym pomiarze `/{slug}/postepy` renderuje bary celów, heatmapę z kolorami stanów, tabelę pomiarów i sparkline. Zrzut ekranu.

- [ ] **Step 4: Commit**

```bash
git add src/app/courses-app
git commit -m "feat(cohort): strona Postępy — cele, heatmapa, pomiary, trendy"
```

---

### Task 13: Klucze API agenta — utils + route'y + strona `/account/agent`

**Files:**
- Create: `src/utilities/agentApiKeys.ts`
- Test: `src/utilities/agentApiKeys.test.ts`
- Create: `src/app/(frontend)/api/courses/agent-keys/route.ts`
- Create: `src/app/courses-app/account/agent/page.tsx`
- Create: `src/app/courses-app/account/agent/AgentKeysPanel.tsx`
- Test (security): rozszerz `src/security/cohortRoutes.test.ts` o blok agent-keys

**Interfaces:**
- Consumes: kolekcja `agent-api-keys` (Task 3).
- Produces: `generateAgentKey(): { plaintext: string; prefix: string; hash: string }` (format `dvc_` + 40 base62), `hashAgentKey(plaintext: string): string` (sha256 hex), `AGENT_KEY_RE = /^dvc_[0-9A-Za-z]{40}$/`, `ACTIVE_KEY_LIMIT = 5`, `verifyAgentKey(payload, bearer: string): Promise<User | null>` (hash lookup, `revokedAt` null, fire-and-forget `lastUsedAt`); `POST /api/courses/agent-keys` `{ name }` → `{ ok, key (plaintext RAZ), prefix }`; `DELETE` `{ id }` → `{ ok }` (tylko własny klucz).

- [ ] **Step 1: Failing test utils**

```ts
// src/utilities/agentApiKeys.test.ts
import { describe, expect, it, vi } from 'vitest'
import { AGENT_KEY_RE, generateAgentKey, hashAgentKey, verifyAgentKey } from './agentApiKeys'

describe('generateAgentKey', () => {
  it('format dvc_ + 40 base62, prefix 12 znaków, hash = sha256(plaintext)', () => {
    const k = generateAgentKey()
    expect(k.plaintext).toMatch(AGENT_KEY_RE)
    expect(k.prefix).toBe(k.plaintext.slice(0, 12))
    expect(k.hash).toBe(hashAgentKey(k.plaintext))
    expect(k.hash).toMatch(/^[0-9a-f]{64}$/)
  })
  it('klucze są unikalne', () => {
    expect(generateAgentKey().plaintext).not.toBe(generateAgentKey().plaintext)
  })
})

describe('verifyAgentKey', () => {
  const key = generateAgentKey()
  const row = { id: 1, user: { id: 9, roles: ['customer'] }, keyHash: key.hash, revokedAt: null }
  const mk = (docs: unknown[]) => ({
    find: vi.fn(async () => ({ docs })),
    update: vi.fn(async () => ({})),
  })
  it('poprawny klucz → user; zły format / revoked / brak → null', async () => {
    expect(await verifyAgentKey(mk([row]) as never, key.plaintext)).toMatchObject({ id: 9 })
    expect(await verifyAgentKey(mk([row]) as never, 'nie-klucz')).toBeNull()
    expect(await verifyAgentKey(mk([{ ...row, revokedAt: '2026-01-01' }]) as never, key.plaintext)).toBeNull()
    expect(await verifyAgentKey(mk([]) as never, key.plaintext)).toBeNull()
  })
})
```

- [ ] **Step 2: Uruchom — FAIL**, potem implementacja

```ts
// src/utilities/agentApiKeys.ts
// Klucze MCP uczestnika: plaintext pokazywany RAZ, w DB tylko SHA-256 + prefix.
import { createHash, randomBytes } from 'crypto'
import type { BasePayload } from 'payload'
import type { User } from '@/payload-types'

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
export const AGENT_KEY_RE = /^dvc_[0-9A-Za-z]{40}$/
export const ACTIVE_KEY_LIMIT = 5

export function hashAgentKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

export function generateAgentKey(): { plaintext: string; prefix: string; hash: string } {
  const bytes = randomBytes(40)
  let body = ''
  for (const b of bytes) body += CHARSET[b % 62]
  const plaintext = `dvc_${body}`
  return { plaintext, prefix: plaintext.slice(0, 12), hash: hashAgentKey(plaintext) }
}

// Bearer → user. Fail-closed: zły format / brak / revoked → null.
export async function verifyAgentKey(payload: BasePayload, bearer: string): Promise<User | null> {
  if (!AGENT_KEY_RE.test(bearer)) return null
  const res = await payload.find({
    collection: 'agent-api-keys',
    where: { keyHash: { equals: hashAgentKey(bearer) } },
    limit: 1,
    depth: 1, // populate user
    overrideAccess: true,
  })
  const row = res.docs[0]
  if (!row || row.revokedAt) return null
  const user = typeof row.user === 'object' && row.user ? (row.user as User) : null
  if (!user) return null
  // telemetria fire-and-forget — błąd nie może zablokować auth
  void payload
    .update({ collection: 'agent-api-keys', id: row.id, data: { lastUsedAt: new Date().toISOString() }, overrideAccess: true })
    .catch(() => {})
  return user
}
```

- [ ] **Step 3: Route**

```ts
// src/app/(frontend)/api/courses/agent-keys/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ACTIVE_KEY_LIMIT, generateAgentKey } from '@/utilities/agentApiKeys'

async function requireUser() {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await nextHeaders() })
  return { payload, user }
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const name = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).name : undefined
  if (typeof name !== 'string' || !name.trim() || name.length > 100)
    return NextResponse.json({ error: 'Podaj nazwę klucza (do 100 znaków)' }, { status: 400 })

  const { payload, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const active = await payload.find({
    collection: 'agent-api-keys',
    where: { and: [{ user: { equals: user.id } }, { revokedAt: { exists: false } }] },
    limit: 0,
    overrideAccess: true,
    depth: 0,
  })
  if (active.totalDocs >= ACTIVE_KEY_LIMIT)
    return NextResponse.json({ error: `Limit ${ACTIVE_KEY_LIMIT} aktywnych kluczy — najpierw unieważnij któryś` }, { status: 409 })

  const key = generateAgentKey()
  await payload.create({
    collection: 'agent-api-keys',
    data: { user: user.id, name: name.trim(), keyPrefix: key.prefix, keyHash: key.hash },
    overrideAccess: true,
  })
  // plaintext wraca DOKŁADNIE raz — nie jest nigdzie zapisywany
  return NextResponse.json({ ok: true, key: key.plaintext, prefix: key.prefix })
}

export async function DELETE(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const id = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).id : undefined
  if (typeof id !== 'number') return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const { payload, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // BOLA: revoke wyłącznie własnego klucza — filtr po user Z SESJI, nie z body.
  const res = await payload.find({
    collection: 'agent-api-keys',
    where: { and: [{ id: { equals: id } }, { user: { equals: user.id } }] },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })
  const row = res.docs[0]
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await payload.update({
    collection: 'agent-api-keys',
    id: row.id,
    data: { revokedAt: new Date().toISOString() },
    overrideAccess: true,
  })
  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'
```

- [ ] **Step 4: Test security route'a** — dopisz do `src/security/cohortRoutes.test.ts` blok: POST bez sesji → 401; POST z sesją → zwraca `key` pasujący do `AGENT_KEY_RE`; szósty aktywny klucz → 409; DELETE cudzego id (find z filtrem user zwraca pusto) → 404. Mocki jak w istniejących blokach tego pliku.

- [ ] **Step 5: Strona `/account/agent`**

```tsx
// src/app/courses-app/account/agent/page.tsx
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AgentKeysPanel } from './AgentKeysPanel'

export const dynamic = 'force-dynamic'

export default async function AgentPage() {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect('/login?next=%2Faccount%2Fagent')

  const res = await payload.find({
    collection: 'agent-api-keys',
    where: { user: { equals: user.id } },
    sort: '-createdAt',
    limit: 50,
    overrideAccess: true,
    depth: 0,
  })
  const keys = res.docs.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.keyPrefix,
    createdAt: String(k.createdAt ?? ''),
    revoked: !!k.revokedAt,
  }))
  const mcpUrl = `${process.env.NEXT_PUBLIC_COURSES_URL ?? ''}/api/agent/mcp`

  return (
    <main className="course-shell mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Agent (MCP)</h1>
      <p className="mt-2 text-sm opacity-70">
        Podepnij Claude Code lub Codex do swojego kursu: agent pobierze dzisiejszą lekcję i zapisze check-in za Ciebie.
      </p>
      <AgentKeysPanel keys={keys} mcpUrl={mcpUrl} />
    </main>
  )
}
```

```tsx
// src/app/courses-app/account/agent/AgentKeysPanel.tsx
'use client'
import { useState } from 'react'

type KeyRow = { id: number; name: string; prefix: string; createdAt: string; revoked: boolean }

export function AgentKeysPanel({ keys, mcpUrl }: { keys: KeyRow[]; mcpUrl: string }) {
  const [name, setName] = useState('')
  const [fresh, setFresh] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await fetch('/api/courses/agent-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setError(data.error ?? 'Nie udało się wygenerować klucza')
    setFresh(data.key)
  }

  async function revoke(id: number) {
    if (!confirm('Unieważnić klucz? Operacja jest natychmiastowa i nieodwracalna.')) return
    await fetch('/api/courses/agent-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    window.location.reload()
  }

  const claudeCmd = fresh
    ? `claude mcp add --transport http devince-kurs ${mcpUrl} --header "Authorization: Bearer ${fresh}"`
    : null

  return (
    <div className="mt-6">
      {fresh ? (
        <div className="course-card p-4">
          <p className="font-medium">Klucz wygenerowany — skopiuj TERAZ, nie pokażemy go ponownie:</p>
          <code className="mt-2 block break-all rounded bg-current/10 p-2 text-xs">{fresh}</code>
          <p className="mt-4 text-sm font-medium">Claude Code:</p>
          <code className="mt-1 block break-all rounded bg-current/10 p-2 text-xs">{claudeCmd}</code>
          <p className="mt-4 text-sm font-medium">Codex (config.toml):</p>
          <code className="mt-1 block whitespace-pre rounded bg-current/10 p-2 text-xs">{`[mcp_servers.devince-kurs]\nurl = "${mcpUrl}"\nhttp_headers = { "Authorization" = "Bearer ${fresh}" }`}</code>
        </div>
      ) : (
        <form onSubmit={generate} className="flex items-end gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Nazwa klucza
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} placeholder="np. laptop-domowy" className="course-input" />
          </label>
          <button type="submit" disabled={busy} className="course-btn-primary">Generuj klucz</button>
        </form>
      )}
      {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}

      <ul className="mt-6 divide-y divide-current/10">
        {keys.map((k) => (
          <li key={k.id} className="flex items-center justify-between py-3 text-sm">
            <div>
              <p className="font-medium">{k.name}</p>
              <p className="opacity-60">{k.prefix}… · {k.createdAt.slice(0, 10)}{k.revoked ? ' · unieważniony' : ''}</p>
            </div>
            {!k.revoked ? (
              <button onClick={() => revoke(k.id)} className="text-red-500 hover:underline">Unieważnij</button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

Dodaj link „Agent (MCP)" w `src/app/courses-app/account/page.tsx` obok istniejących akcji konta.

- [ ] **Step 6: Testy zielone** — `pnpm exec vitest run src/utilities/agentApiKeys.test.ts src/security/cohortRoutes.test.ts` → PASS

- [ ] **Step 7: Commit**

```bash
git add src/utilities/agentApiKeys.ts src/utilities/agentApiKeys.test.ts "src/app/(frontend)/api/courses/agent-keys" src/app/courses-app/account src/security/cohortRoutes.test.ts
git commit -m "feat(cohort): klucze API agenta — generacja/revoke + strona konta"
```

---

### Task 14: Endpoint MCP uczestnika + 5 narzędzi

**Files:**
- Modify: `package.json` (dodaj `mcp-handler` — decyzja właściciela w specu; `pnpm add mcp-handler`)
- Create: `src/utilities/agentMcp.ts` (rate-limit + rejestracja narzędzi)
- Create: `src/app/(frontend)/api/agent/[transport]/route.ts`
- Test: `src/security/agentMcp.test.ts`

**Interfaces:**
- Consumes: `verifyAgentKey` (Task 13), `resolveCohortContext`, `getTodayData`, `getProgressData`, `saveCheckinAction`, `saveMeasurementAction`, `completeLessonAction` (Task 6).
- Produces: endpoint `POST /api/agent/mcp` (streamable HTTP); narzędzia `get_today`, `save_checkin`, `complete_lesson`, `get_progress`, `save_measurement` — każde z opcjonalnym argumentem `program` (slug; wymagany przy >1 kursie kohortowym usera); `rateLimitOk(userId: number): boolean` (okno przesuwne 60 wywołań / 60 s, in-memory).

- [ ] **Step 1: Failing test (rate-limit + wybór programu)**

```ts
// src/security/agentMcp.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rateLimitOk, resolveProgramSlugForUser } from '@/utilities/agentMcp'

describe('rateLimitOk', () => {
  beforeEach(() => vi.useFakeTimers())
  it('60 wywołań przechodzi, 61. w oknie odpada, po minucie znowu OK', () => {
    vi.setSystemTime(new Date('2026-07-05T12:00:00Z'))
    for (let i = 0; i < 60; i++) expect(rateLimitOk(1)).toBe(true)
    expect(rateLimitOk(1)).toBe(false)
    expect(rateLimitOk(2)).toBe(true) // limit per user
    vi.setSystemTime(new Date('2026-07-05T12:01:01Z'))
    expect(rateLimitOk(1)).toBe(true)
  })
})

describe('resolveProgramSlugForUser', () => {
  const mk = (memberDocs: unknown[], programDocs: unknown[]) => ({
    find: vi.fn(async ({ collection }: { collection: string }) =>
      collection === 'cohort-members' ? { docs: memberDocs } : { docs: programDocs },
    ),
  })
  it('jeden kurs kohortowy → jego slug; podany argument wygrywa; wiele bez argumentu → błąd z listą', async () => {
    const one = mk([{ program: 7 }], [{ id: 7, slug: 'dadmode' }])
    expect(await resolveProgramSlugForUser(one as never, 1, undefined)).toEqual({ ok: true, slug: 'dadmode' })
    const two = mk([{ program: 7 }, { program: 8 }], [{ id: 7, slug: 'a' }, { id: 8, slug: 'b' }])
    expect(await resolveProgramSlugForUser(two as never, 1, 'b')).toEqual({ ok: true, slug: 'b' })
    const err = await resolveProgramSlugForUser(two as never, 1, undefined)
    expect(err.ok).toBe(false)
    if (!err.ok) expect(err.error).toContain('a')
  })
  it('zero kursów → błąd', async () => {
    const none = mk([], [])
    expect((await resolveProgramSlugForUser(none as never, 1, undefined)).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Uruchom — FAIL**, potem implementacja utils + rejestracji narzędzi

```ts
// src/utilities/agentMcp.ts
// MCP uczestnika: rate-limit i logika narzędzi. TWARDE REGUŁY (jak primal60):
// user ZAWSZE z klucza API (pierwszy parametr), NIGDY z argumentów narzędzia;
// gating re-sprawdzany serwerowo przez cohortActions; treść zablokowanej
// lekcji nie wychodzi (getTodayData jest fail-closed).
import type { BasePayload } from 'payload'
import type { User } from '@/payload-types'
import {
  completeLessonAction,
  getProgressData,
  getTodayData,
  resolveCohortContext,
  saveCheckinAction,
  saveMeasurementAction,
} from './cohortActions'

const WINDOW_MS = 60_000
const MAX_CALLS = 60
const hits = new Map<number, number[]>()

// ponytail: in-memory sliding window — wystarcza dla 1 instancji; Redis gdy repliki
export function rateLimitOk(userId: number): boolean {
  const now = Date.now()
  const list = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS)
  if (list.length >= MAX_CALLS) {
    hits.set(userId, list)
    return false
  }
  list.push(now)
  hits.set(userId, list)
  return true
}

// Slug kursu kohortowego usera: argument wygrywa; bez argumentu — jedyny kurs
// albo błąd z listą do wyboru.
export async function resolveProgramSlugForUser(
  payload: BasePayload,
  userId: number,
  requested: string | undefined,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const members = await payload.find({
    collection: 'cohort-members',
    where: { user: { equals: userId } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })
  const programIds = members.docs.map((m) => (typeof m.program === 'object' && m.program ? m.program.id : m.program))
  if (!programIds.length) return { ok: false, error: 'Nie jesteś zapisany na żaden kurs kohortowy.' }
  const programs = await payload.find({
    collection: 'program',
    where: { id: { in: programIds } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })
  const slugs = programs.docs.map((p) => p.slug).filter((s): s is string => typeof s === 'string')
  if (requested) {
    if (slugs.includes(requested)) return { ok: true, slug: requested }
    return { ok: false, error: `Nie masz kursu "${requested}". Dostępne: ${slugs.join(', ')}` }
  }
  if (slugs.length === 1) return { ok: true, slug: slugs[0] }
  return { ok: false, error: `Podaj argument program. Dostępne: ${slugs.join(', ')}` }
}

type ToolResult = { content: { type: 'text'; text: string }[] }
const json = (data: unknown): ToolResult => ({ content: [{ type: 'text', text: JSON.stringify(data) }] })
const fail = (error: string): ToolResult => json({ error })

async function withCtx(
  payload: BasePayload,
  user: User,
  programArg: string | undefined,
  fn: (ctx: Awaited<ReturnType<typeof resolveCohortContext>>) => Promise<ToolResult>,
): Promise<ToolResult> {
  if (!rateLimitOk(user.id)) return fail('Przekroczony limit 60 wywołań na minutę — odczekaj chwilę.')
  const resolved = await resolveProgramSlugForUser(payload, user.id, programArg)
  if (!resolved.ok) return fail(resolved.error)
  const ctx = await resolveCohortContext(payload, user, resolved.slug)
  if ('error' in ctx) return fail(ctx.error)
  return fn(ctx)
}

// Rejestracja narzędzi na serwerze MCP (server: instancja z mcp-handler).
// Schematy inputów: zod z pakietu zależności mcp-handler (peer: zod) — importuj
// `z` z 'zod'; to jedyne miejsce w repo używające zod (przychodzi z mcp-handler).
export function registerCohortTools(
  server: {
    tool: (
      name: string,
      description: string,
      schema: Record<string, unknown>,
      handler: (args: Record<string, unknown>, extra: { authInfo?: { extra?: { user?: User } } }) => Promise<ToolResult>,
    ) => void
  },
  payload: BasePayload,
  z: typeof import('zod'),
) {
  const programArg = { program: z.z.string().optional().describe('Slug kursu (wymagany przy >1 kursie)') }
  const userOf = (extra: { authInfo?: { extra?: { user?: User } } }): User | null => extra.authInfo?.extra?.user ?? null

  server.tool(
    'get_today',
    'Dzisiejszy stan kursu: dzień programu, streak, dzisiejszy check-in i treść lekcji dnia (jeśli odblokowana).',
    programArg,
    async (args, extra) => {
      const user = userOf(extra)
      if (!user) return fail('unauthorized')
      return withCtx(payload, user, args.program as string | undefined, async (ctx) => {
        if ('error' in ctx) return fail(ctx.error)
        const data = await getTodayData(payload, user, ctx)
        return json({
          program_day: data.programDay,
          state: data.state,
          streak: data.streak,
          today_checkin: data.todayCheckin,
          lesson: data.lesson
            ? { title: data.lesson.title, nr: data.lesson.nr, slug: data.lesson.slug, why: data.lesson.why, what: data.lesson.what, dod: data.lesson.dod }
            : null,
          unlocks_at: data.unlocksAt,
        })
      })
    },
  )

  server.tool(
    'save_checkin',
    'Zapisz dzienny check-in (tylko dziś lub wczoraj). minimumDone napędza streak i auto-ukańcza dzisiejszą lekcję.',
    {
      ...programArg,
      date: z.z.string().describe('YYYY-MM-DD'),
      minimumDone: z.z.boolean(),
      note: z.z.string().max(2000).optional(),
      values: z.z.record(z.z.unknown()).optional().describe('Pola wg konfiguracji kursu'),
    },
    async (args, extra) => {
      const user = userOf(extra)
      if (!user) return fail('unauthorized')
      return withCtx(payload, user, args.program as string | undefined, async (ctx) => {
        if ('error' in ctx) return fail(ctx.error)
        const res = await saveCheckinAction(payload, user, ctx, {
          date: String(args.date),
          minimumDone: Boolean(args.minimumDone),
          note: args.note as string | undefined,
          values: args.values,
        })
        return res.ok ? json(res) : fail(res.error)
      })
    },
  )

  server.tool(
    'complete_lesson',
    'Oznacz lekcję dnia jako ukończoną (tylko odblokowaną).',
    { ...programArg, day: z.z.number().int().min(1) },
    async (args, extra) => {
      const user = userOf(extra)
      if (!user) return fail('unauthorized')
      return withCtx(payload, user, args.program as string | undefined, async (ctx) => {
        if ('error' in ctx) return fail(ctx.error)
        const res = await completeLessonAction(payload, user, ctx, Number(args.day))
        return res.ok ? json(res) : fail(res.error)
      })
    },
  )

  server.tool(
    'get_progress',
    'Pełny postęp: check-iny, ukończone dni, pomiary, streak, cele ukończenia.',
    programArg,
    async (args, extra) => {
      const user = userOf(extra)
      if (!user) return fail('unauthorized')
      return withCtx(payload, user, args.program as string | undefined, async (ctx) => {
        if ('error' in ctx) return fail(ctx.error)
        return json(await getProgressData(payload, user, ctx))
      })
    },
  )

  server.tool(
    'save_measurement',
    'Zapisz pomiar w punkcie kontrolnym (np. D0/D30/D60) wg metryk kursu.',
    { ...programArg, point: z.z.string(), values: z.z.record(z.z.number()) },
    async (args, extra) => {
      const user = userOf(extra)
      if (!user) return fail('unauthorized')
      return withCtx(payload, user, args.program as string | undefined, async (ctx) => {
        if ('error' in ctx) return fail(ctx.error)
        const res = await saveMeasurementAction(payload, user, ctx, { point: String(args.point), values: args.values })
        return res.ok ? json(res) : fail(res.error)
      })
    },
  )
}
```

(Uwaga wykonawcza: dokładne API `mcp-handler`/`zod` sprawdź w primal60 — `src/app/api/[transport]/route.ts` i `src/lib/mcp/tools.ts` to działający wzorzec; import `z` zwykle `import { z } from 'zod'`, wtedy w sygnaturze `z: typeof z` zamiast namespace-tricku powyżej. Dostosuj typ parametru `server` do rzeczywistego typu z mcp-handler zamiast strukturalnego.)

- [ ] **Step 3: Route**

```ts
// src/app/(frontend)/api/agent/[transport]/route.ts
// Endpoint MCP uczestnika: /api/agent/mcp (streamable HTTP).
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import * as z from 'zod'
import { registerCohortTools } from '@/utilities/agentMcp'
import { verifyAgentKey } from '@/utilities/agentApiKeys'

const handler = createMcpHandler(
  async (server) => {
    const payload = await getPayload({ config: configPromise })
    registerCohortTools(server as never, payload, z as never)
  },
  {},
  { basePath: '/api/agent' },
)

const authed = withMcpAuth(
  handler,
  async (_req, bearer) => {
    if (!bearer) return undefined
    const payload = await getPayload({ config: configPromise })
    const user = await verifyAgentKey(payload, bearer)
    if (!user) return undefined
    return { token: bearer, scopes: [], clientId: String(user.id), extra: { user } }
  },
  { required: true },
)

export { authed as GET, authed as POST }
```

(Sygnatura `withMcpAuth` — odwzoruj 1:1 z primal60 `src/app/api/[transport]/route.ts`, łącznie z kształtem `AuthInfo`.)

- [ ] **Step 4: Testy zielone** — `pnpm exec vitest run src/security/agentMcp.test.ts` → PASS

- [ ] **Step 5: Dowód end-to-end** — `pnpm dev`, wygeneruj klucz na `/account/agent`, potem:

```bash
curl -s -X POST http://localhost:3010/api/agent/mcp \
  -H "Authorization: Bearer dvc_..." -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expected: SSE z listą 5 narzędzi. Następnie `tools/call` `get_today` → JSON z `program_day`/`lesson`. Bez nagłówka Authorization → 401.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/utilities/agentMcp.ts "src/app/(frontend)/api/agent" src/security/agentMcp.test.ts
git commit -m "feat(cohort): MCP uczestnika — 5 narzędzi za kluczem API"
```

---

### Task 15: Widok admina „Dziś w kohorcie"

**Files:**
- Create: `src/app/courses-app/cohorts-admin/page.tsx`

**Interfaces:**
- Consumes: kolekcje `cohorts`, `cohort-members`, `checkins`; `dateInTz`, `clockFor` (Task 1/5).
- Produces: strona admin-only `/cohorts-admin?cohort=<id>` — roster wybranej kohorty ze statusem minimum na dziś.

- [ ] **Step 1: Implementacja**

```tsx
// src/app/courses-app/cohorts-admin/page.tsx
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Cohort, Program, User } from '@/payload-types'
import { dateInTz } from '@/utilities/cohortUnlock'

export const dynamic = 'force-dynamic'

export default async function CohortsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>
}) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  // Twarda bramka roli — strona wyłącznie dla admina.
  if (!user || !(Array.isArray(user.roles) && user.roles.includes('admin'))) redirect('/')

  const { cohort: cohortParam } = await searchParams
  const cohortsRes = await payload.find({ collection: 'cohorts', limit: 100, depth: 1, overrideAccess: true, sort: '-startDate' })
  const cohorts = cohortsRes.docs as Cohort[]
  const selected = cohorts.find((c) => String(c.id) === cohortParam) ?? cohorts[0]
  if (!selected)
    return (
      <main className="course-shell mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Kohorty</h1>
        <p className="mt-3 opacity-70">Brak kohort — utwórz pierwszą w panelu Payload.</p>
      </main>
    )

  const program = typeof selected.program === 'object' ? (selected.program as Program) : null
  const tz = program?.cohortConfig?.timezone || 'Europe/Warsaw'
  const today = dateInTz(new Date(), tz)

  const membersRes = await payload.find({
    collection: 'cohort-members',
    where: { cohort: { equals: selected.id } },
    limit: 500,
    depth: 1,
    overrideAccess: true,
  })
  const memberUsers = membersRes.docs
    .map((m) => (typeof m.user === 'object' && m.user ? (m.user as User) : null))
    .filter((u): u is User => !!u)

  const checkinsRes = memberUsers.length
    ? await payload.find({
        collection: 'checkins',
        where: {
          and: [
            { user: { in: memberUsers.map((u) => u.id) } },
            { program: { equals: program?.id ?? 0 } },
            { date: { equals: today } },
          ],
        },
        limit: 500,
        depth: 0,
        overrideAccess: true,
      })
    : { docs: [] }
  const byUser = new Map(
    checkinsRes.docs.map((c) => [typeof c.user === 'object' && c.user ? c.user.id : c.user, !!c.minimumDone]),
  )
  const doneCount = [...byUser.values()].filter(Boolean).length

  return (
    <main className="course-shell mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Dziś w kohorcie</h1>
      <nav className="mt-4 flex flex-wrap gap-2">
        {cohorts.map((c) => (
          <Link
            key={c.id}
            href={`/cohorts-admin?cohort=${c.id}`}
            className={`course-chip ${c.id === selected.id ? 'course-chip-active' : ''}`}
          >
            {c.name}
          </Link>
        ))}
      </nav>
      <p className="mt-6 text-lg font-medium">
        {doneCount} / {memberUsers.length} z minimum ({today})
      </p>
      <ul className="mt-4 divide-y divide-current/10">
        {memberUsers.map((u) => {
          const st = byUser.get(u.id) // true=minimum, false=wpis bez minimum, undefined=brak wpisu
          return (
            <li key={u.id} className="flex items-center gap-3 py-2 text-sm">
              <span
                className={`inline-block h-3 w-3 rounded-full ${
                  st === true ? 'bg-green-500' : st === false ? 'bg-current/30' : 'border border-current/40'
                }`}
              />
              <span>{u.name ?? u.email}</span>
              <span className="opacity-50">{u.email}</span>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
```

- [ ] **Step 2: Dowód** — zaloguj się jako admin → `/cohorts-admin` pokazuje roster ze statusami; jako klient → redirect na `/`. Zrzut ekranu.

- [ ] **Step 3: Commit**

```bash
git add src/app/courses-app/cohorts-admin
git commit -m "feat(cohort): widok admina — dziś w kohorcie"
```

---

### Task 16: Finał — docs, pełna weryfikacja, audyt

**Files:**
- Modify: `docs/HANDOFF.md` (sekcja: tryb kohortowy — jak skonfigurować kurs, kohorty, invite'y, MCP uczestnika)
- Modify: `CLAUDE.md` (Mapa terenu: nowe kolekcje + przepływ kohortowy; Pułapki: `values` walidowane wg configu, unikalne indeksy naturalne)
- Modify: `docs/EXTERNAL-CONTENT-API.md` — TYLKO jeśli zakres external API się zmienił (w tym planie NIE — dopisz jedną linię, że cohortConfig ustawia się przez istniejący `PATCH /api/external/programs/<id>`)

- [ ] **Step 1: Pełna bramka lokalna**

Run: `pnpm test:int && node scripts/lint-security.mjs && pnpm lint && pnpm build`
Expected: wszystko zielone (test:int: 49+ plików; build przechodzi = bramka typów).

- [ ] **Step 2: Przejazd flow w przeglądarce (dowód end-to-end)** — kurs testowy: konfiguracja w adminie → invite → join → dzisiaj → check-in → player z kłódkami → postępy → agent-keys → MCP curl. Zrzuty ekranu kluczowych stanów.

- [ ] **Step 3: Aktualizacja docs + commit**

```bash
git add docs/HANDOFF.md CLAUDE.md docs/EXTERNAL-CONTENT-API.md
git commit -m "docs: tryb kohortowy — handoff + mapa terenu"
```

- [ ] **Step 4: Audyt bezpieczeństwa (wymóg właściciela)** — uruchom skill `security-audit` na całości zmian (nowe route'y, access, MCP, invite'y). Wszystkie znaleziska C/H/M naprawić przed uznaniem zadania za skończone; L — decyzja właściciela.

- [ ] **Step 5: PR** — branch `feat/cohort-mode`, push, PR na `main` z podsumowaniem wg protokołu (Co zmienione / Atak / Granice zaufania / Dowód).

---

## Uwagi wykonawcze (przeczytaj przed Task 1)

- Wzorce do naśladowania w tym repo: route = `src/app/(frontend)/api/apps/checkout/route.ts` + `src/app/(frontend)/api/courses/progress/route.ts`; kolekcja = `src/collections/LessonProgress.ts`; test route'a = `src/app/(frontend)/api/apps/checkout/checkout.test.ts`; test security = pliki w `src/security/`.
- Źródło mechanik (primal60): `/home/bartek/primal60/src/lib/unlock.ts` (matematyka), `src/lib/streak.ts`, `src/lib/completion.ts`, `src/lib/trend.ts`, `src/actions/checkin.ts` (reguły zapisu), `src/actions/join.ts` (invite), `src/lib/api-keys.ts` + `src/app/api/[transport]/route.ts` (MCP). Przy wątpliwościach co do zachowania — primal60 jest wzorcem.
- Payload zwraca relacje jako `number | object` zależnie od `depth` — zawsze normalizuj (`typeof x === 'object' ? x.id : x`), wzór w kodzie wyżej.
- Po Task 3 KAŻDA zmiana schematu kolekcji wymaga nowej migracji — nie edytuj już-zacommitowanej migracji.
- Lokalne porty: dev app 3010, Postgres 5436 (docker compose up -d).
- Testy z `vi.useFakeTimers()` — pamiętaj o `vi.useRealTimers()` w `afterEach`, inaczej przeciekasz fake-clock do innych testów w pliku.
