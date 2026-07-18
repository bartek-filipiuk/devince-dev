// INWARIANT: treść zablokowanej lekcji kursu kohortowego nie opuszcza serwera —
// egzekwowane w access `enrolledOrAdmin` (warstwa zapytań), nie tylko w UI.
import { afterEach, describe, expect, it, vi } from 'vitest'
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

afterEach(() => {
  vi.useRealTimers()
})

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
  })
})
