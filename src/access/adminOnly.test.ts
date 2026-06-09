import { describe, it, expect } from 'vitest'
import { adminOnly, adminOnlyField } from './adminOnly'

const callAccess = (user: any) => adminOnly({ req: { user } } as any)
const callField = (user: any) => adminOnlyField({ req: { user } } as any)

describe('adminOnly', () => {
  it('denies anonymous', () => expect(callAccess(null)).toBe(false))
  it('denies customer', () => expect(callAccess({ roles: ['customer'] })).toBe(false))
  it('denies user with no roles', () => expect(callAccess({ roles: [] })).toBe(false))
  it('denies user with missing roles array', () => expect(callAccess({})).toBe(false))
  it('allows admin', () => expect(callAccess({ roles: ['admin'] })).toBe(true))
  it('allows admin+customer', () =>
    expect(callAccess({ roles: ['admin', 'customer'] })).toBe(true))
})

describe('adminOnlyField', () => {
  it('denies anonymous', () => expect(callField(null)).toBe(false))
  it('denies customer', () => expect(callField({ roles: ['customer'] })).toBe(false))
  it('denies user with no roles', () => expect(callField({ roles: [] })).toBe(false))
  it('allows admin', () => expect(callField({ roles: ['admin'] })).toBe(true))
})
