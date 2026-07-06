import { describe, it, expect } from 'vitest'
import { sortEntriesDesc, formatChangelogDate, type ChangelogEntry } from './groupByDate'

const entry = (date: string): ChangelogEntry => ({ date, notes: [{ text: 't', tag: 'platform' }] })

describe('sortEntriesDesc', () => {
  it('orders newest first without mutating input', () => {
    const input = [entry('2026-06-20'), entry('2026-06-25'), entry('2026-06-22')]
    const out = sortEntriesDesc(input)
    expect(out.map((e) => e.date)).toEqual(['2026-06-25', '2026-06-22', '2026-06-20'])
    expect(input[0].date).toBe('2026-06-20') // unmutated
  })
})

describe('formatChangelogDate', () => {
  it('returns the raw value for an unparseable date', () => {
    expect(formatChangelogDate('not-a-date', 'pl')).toBe('not-a-date')
  })

  it('formats a valid ISO date', () => {
    expect(formatChangelogDate('2026-06-25T10:00:00.000Z', 'en')).toMatch(/2026/)
  })
})
