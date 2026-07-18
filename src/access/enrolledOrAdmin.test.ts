import { describe, it, expect, vi } from 'vitest'
import { enrolledOrAdmin } from './enrolledOrAdmin'

function fakePayload({ programs = [], members = [] }: { programs?: unknown[]; members?: unknown[] } = {}) {
  return {
    find: vi.fn(async ({ collection }: { collection: string }) => {
      if (collection === 'program') return { docs: programs }
      if (collection === 'cohort-members') return { docs: members }
      throw new Error(`unexpected collection ${collection}`)
    }),
  }
}

const selfPaced = (id: number) => ({ id, deliveryMode: 'self-paced', cohortConfig: null })

const call = (user: any, payload = fakePayload()) => enrolledOrAdmin({ req: { user, payload } } as any)

describe('enrolledOrAdmin', () => {
  it('denies anonymous', async () => expect(await call(null)).toBe(false))
  it('allows admin', async () => expect(await call({ roles: ['admin'] })).toBe(true))
  it('restricts customer to purchased programs', async () => {
    const payload = fakePayload({ programs: [selfPaced(1), selfPaced(2)] })
    expect(await call({ roles: ['customer'], purchases: [1, { id: 2 }] }, payload)).toEqual({
      or: [{ program: { in: [1, 2] } }],
    })
  })
  it('customer with no purchases is denied (fail-closed)', async () => {
    expect(await call({ roles: ['customer'], purchases: [] })).toBe(false)
  })

  // ── D4: attack cases ──────────────────────────────────────────────────────

  it('purchase of ANOTHER course does not open this one (constraint excludes it)', async () => {
    // Buyer owns program 1 only. The returned where-clause must pin access to
    // exactly the owned ids — an `in` list containing 2 would be the paywall hole.
    const result = await call({ roles: ['customer'], purchases: [1] }, fakePayload({ programs: [selfPaced(1)] }))
    expect(result).toEqual({ or: [{ program: { in: [1] } }] })
    expect((result as { or: [{ program: { in: number[] } }] }).or[0].program.in).not.toContain(2)
  })

  it('BOLA: attacker-supplied userId/params in the request cannot widen access', async () => {
    // Access derives ONLY from req.user.purchases (the session). Smuggling a
    // victim id via query/body/params must leave the constraint unchanged.
    const attacker = { id: 9, roles: ['customer'], purchases: [1] }
    const result = await enrolledOrAdmin({
      req: {
        user: attacker,
        payload: fakePayload({ programs: [selfPaced(1)] }),
        query: { userId: 'victim' },
        data: { userId: 'victim', purchases: [99] },
        params: { userId: 'victim' },
      },
    } as any)
    expect(result).toEqual({ or: [{ program: { in: [1] } }] })
  })

  it('roles smuggled as a non-array or wrong value do not grant admin', async () => {
    expect(await call({ roles: 'admin', purchases: [] })).toBe(false)
    expect(await call({ roles: ['customer', 'superuser'], purchases: [] })).toBe(false)
  })

  it('user without a purchases field at all is denied, not a crash', async () => {
    expect(await call({ roles: ['customer'] })).toBe(false)
  })
})
