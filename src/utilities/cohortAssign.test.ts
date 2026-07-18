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
