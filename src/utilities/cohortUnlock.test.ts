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
