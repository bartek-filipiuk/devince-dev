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
})
