import crypto from 'crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { signClaim, verifyClaim, type ClaimPayload } from './claimToken'

const SECRET = 'claim-secret-test'

describe('claimToken sign/verify (the free-access security boundary)', () => {
  let saved: string | undefined
  beforeEach(() => {
    saved = process.env.CLAIM_TOKEN_SECRET
    process.env.CLAIM_TOKEN_SECRET = SECRET
  })
  afterEach(() => {
    if (saved === undefined) delete process.env.CLAIM_TOKEN_SECRET
    else process.env.CLAIM_TOKEN_SECRET = saved
  })

  it('round-trips a course claim', () => {
    const payload: ClaimPayload = { kind: 'course', itemId: '16', email: 'a@b.pl' }
    const token = signClaim(payload)
    expect(verifyClaim(token)).toEqual(payload)
  })

  it('round-trips an app claim', () => {
    const payload: ClaimPayload = { kind: 'app', itemId: '7', email: 'buyer@example.com' }
    const token = signClaim(payload)
    expect(verifyClaim(token)).toEqual(payload)
  })

  it('produces a "<b64url>.<hex>" shape with no padding/url-unsafe chars in the body', () => {
    const token = signClaim({ kind: 'app', itemId: '7', email: 'a@b.pl' })
    const dot = token.lastIndexOf('.')
    expect(dot).toBeGreaterThan(0)
    const body = token.slice(0, dot)
    expect(body).not.toMatch(/[+/=]/) // base64url, unpadded
  })

  it('returns null for a tampered payload (re-encoded body, original sig)', () => {
    const token = signClaim({ kind: 'app', itemId: '7', email: 'a@b.pl' })
    const dot = token.lastIndexOf('.')
    const sig = token.slice(dot + 1)
    // forge a free grant for an EXPENSIVE course by swapping the body
    const forgedBody = Buffer.from(
      JSON.stringify({ kind: 'course', itemId: '999', email: 'attacker@evil.com' }),
    ).toString('base64url')
    expect(verifyClaim(`${forgedBody}.${sig}`)).toBeNull()
  })

  it('returns null for a tampered signature', () => {
    const token = signClaim({ kind: 'app', itemId: '7', email: 'a@b.pl' })
    const dot = token.lastIndexOf('.')
    const body = token.slice(0, dot)
    expect(verifyClaim(`${body}.deadbeef`)).toBeNull()
  })

  it('returns null when signed with a different secret (forge attempt)', () => {
    process.env.CLAIM_TOKEN_SECRET = 'attacker-secret'
    const forged = signClaim({ kind: 'course', itemId: '16', email: 'a@b.pl' })
    process.env.CLAIM_TOKEN_SECRET = SECRET
    expect(verifyClaim(forged)).toBeNull()
  })

  it.each([
    '',
    'no-dot',
    '.',
    'a.',
    '.abc',
    'not-base64-$$.deadbeef',
    'eyJ.zzzz',
    `${Buffer.from('{not json').toString('base64url')}.deadbeef`,
  ])('returns null for garbage input %j without throwing', (token) => {
    expect(() => verifyClaim(token)).not.toThrow()
    expect(verifyClaim(token)).toBeNull()
  })

  it('returns null for a payload with the wrong kind value', () => {
    // hand-craft a correctly-signed token but with an invalid `kind`
    process.env.CLAIM_TOKEN_SECRET = SECRET
    const bad = { kind: 'admin', itemId: '7', email: 'a@b.pl' }
    const body = Buffer.from(JSON.stringify(bad)).toString('base64url')
    // sign it the same way signClaim does so the HMAC is valid but the shape isn't
    const sig = crypto.createHmac('sha256', SECRET).update(body).digest('hex')
    expect(verifyClaim(`${body}.${sig}`)).toBeNull()
  })

  it('returns null when CLAIM_TOKEN_SECRET is unset (fails closed, no throw)', () => {
    const token = signClaimWithSecret({ kind: 'app', itemId: '7', email: 'a@b.pl' }, SECRET)
    delete process.env.CLAIM_TOKEN_SECRET
    expect(() => verifyClaim(token)).not.toThrow()
    expect(verifyClaim(token)).toBeNull()
  })

  it('signClaim throws when CLAIM_TOKEN_SECRET is unset (server misconfig is loud)', () => {
    delete process.env.CLAIM_TOKEN_SECRET
    expect(() => signClaim({ kind: 'app', itemId: '7', email: 'a@b.pl' })).toThrow()
  })
})

// helper: sign with an explicit secret regardless of env, mirroring signClaim's algorithm
function signClaimWithSecret(payload: ClaimPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return `${body}.${sig}`
}
