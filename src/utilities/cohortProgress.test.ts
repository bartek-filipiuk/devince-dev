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
