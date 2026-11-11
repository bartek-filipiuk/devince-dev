import { describe, expect, it } from 'vitest'
import { Users, blockUndeliverableReset } from './index'

describe('Users auth', () => {
  it('the set-password link from the purchase email outlives a long weekend (no reset email exists)', () => {
    const auth = Users.auth as { forgotPassword?: { expiration?: number } }
    expect(auth.forgotPassword?.expiration).toBeGreaterThanOrEqual(7 * 24 * 3600 * 1000)
  })
  it('a public forgot-password cannot overwrite the purchase token; server code with disableEmail can', () => {
    const run = (args: object) =>
      (blockUndeliverableReset as (a: unknown) => unknown)({ args, operation: 'forgotPassword' })
    expect(() => run({ data: { email: 'a@b.c' } })).toThrow()
    expect(() => run({ data: { email: 'a@b.c' }, disableEmail: true })).not.toThrow()
    expect((blockUndeliverableReset as (a: unknown) => unknown)({ args: { x: 1 }, operation: 'login' })).toEqual({ x: 1 })
  })
})
