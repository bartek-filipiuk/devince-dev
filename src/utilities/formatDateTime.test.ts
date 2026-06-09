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
