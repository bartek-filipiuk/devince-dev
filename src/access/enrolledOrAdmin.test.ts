import { describe, it, expect } from 'vitest'
import { enrolledOrAdmin } from './enrolledOrAdmin'

const call = (user: any) => enrolledOrAdmin({ req: { user } } as any)

describe('enrolledOrAdmin', () => {
  it('denies anonymous', () => expect(call(null)).toBe(false))
  it('allows admin', () => expect(call({ roles: ['admin'] })).toBe(true))
  it('restricts customer to purchased programs', () => {
    expect(call({ roles: ['customer'], purchases: ['p1', { id: 'p2' }] })).toEqual({
      program: { in: ['p1', 'p2'] },
    })
  })
  it('customer with no purchases gets empty constraint', () => {
    expect(call({ roles: ['customer'], purchases: [] })).toEqual({ program: { in: [] } })
  })

  // ── D4: attack cases ──────────────────────────────────────────────────────

  it('purchase of ANOTHER course does not open this one (constraint excludes it)', () => {
    // Buyer owns p1 only. The returned where-clause must pin access to exactly
    // the owned ids — an `in` list that contains p2 would be the paywall hole.
    const result = call({ roles: ['customer'], purchases: ['p1'] })
    expect(result).toEqual({ program: { in: ['p1'] } })
    expect((result as { program: { in: string[] } }).program.in).not.toContain('p2')
  })

  it('BOLA: attacker-supplied userId/params in the request cannot widen access', () => {
    // Access derives ONLY from req.user.purchases (the session). Smuggling a
    // victim id via query/body/params must leave the constraint unchanged.
    const attacker = { id: 'attacker', roles: ['customer'], purchases: ['own-course'] }
    const result = enrolledOrAdmin({
      req: {
        user: attacker,
        query: { userId: 'victim' },
        data: { userId: 'victim', purchases: ['victims-course'] },
        params: { userId: 'victim' },
      },
    } as any)
    expect(result).toEqual({ program: { in: ['own-course'] } })
  })

  it('roles smuggled as a non-array or wrong value do not grant admin', () => {
    expect(call({ roles: 'admin', purchases: [] })).toEqual({ program: { in: [] } })
    expect(call({ roles: ['customer', 'superuser'], purchases: [] })).toEqual({
      program: { in: [] },
    })
  })

  it('user without a purchases field at all gets empty constraint (deny), not a crash', () => {
    expect(call({ roles: ['customer'] })).toEqual({ program: { in: [] } })
  })
})
