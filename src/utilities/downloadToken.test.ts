import { describe, expect, it } from 'vitest'
import { createDownloadToken, evaluateGrant, signDownloadToken, verifyDownloadToken } from './downloadToken'

const secret = 'test-secret'

describe('downloadToken sign/verify', () => {
  it('verifies a token it signed', () => {
    const token = signDownloadToken({ nonce: 'abc-123', secret })
    expect(verifyDownloadToken({ token, secret })).toBe(true)
  })
  it('createDownloadToken produces unique, verifiable tokens', () => {
    const a = createDownloadToken(secret)
    const b = createDownloadToken(secret)
    expect(a).not.toBe(b)
    expect(verifyDownloadToken({ token: a, secret })).toBe(true)
  })
  it('rejects a tampered nonce', () => {
    const token = signDownloadToken({ nonce: 'abc-123', secret })
    expect(verifyDownloadToken({ token: 'x' + token, secret })).toBe(false)
  })
  it('rejects a wrong secret', () => {
    const token = signDownloadToken({ nonce: 'abc-123', secret })
    expect(verifyDownloadToken({ token, secret: 'other' })).toBe(false)
  })
  it.each(['', 'no-dot', '.', 'a.', '.abc', 'a.zzzz', 'a.deadbeef'])(
    'rejects malformed token %j without throwing',
    (token) => {
      expect(verifyDownloadToken({ token, secret })).toBe(false)
    },
  )
})

describe('evaluateGrant', () => {
  const now = new Date('2026-06-11T00:00:00Z')
  const future = '2026-06-18T00:00:00Z'
  it('ok when unexpired and under limit', () => {
    expect(evaluateGrant({ expiresAt: future, uses: 0, maxUses: 5 }, now)).toEqual({ ok: true })
  })
  it('expired when expiresAt <= now', () => {
    expect(evaluateGrant({ expiresAt: '2026-06-10T00:00:00Z', uses: 0, maxUses: 5 }, now)).toEqual({ ok: false, reason: 'expired' })
  })
  it('limit when uses >= maxUses', () => {
    expect(evaluateGrant({ expiresAt: future, uses: 5, maxUses: 5 }, now)).toEqual({ ok: false, reason: 'limit' })
  })
})
