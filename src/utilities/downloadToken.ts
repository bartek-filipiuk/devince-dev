import crypto from 'crypto'

/**
 * HMAC-signed download tokens for account-less purchase fulfillment.
 * Token format: "<nonce>.<hmacSha256Hex(nonce, secret)>".
 * verify runs BEFORE any DB lookup — malformed/forged tokens are rejected
 * cheaply and in constant time (timingSafeEqual).
 */
export function signDownloadToken(args: { nonce: string; secret: string }): string {
  const sig = crypto.createHmac('sha256', args.secret).update(args.nonce).digest('hex')
  return `${args.nonce}.${sig}`
}

export function createDownloadToken(secret: string): string {
  return signDownloadToken({ nonce: crypto.randomUUID(), secret })
}

export function verifyDownloadToken(args: { token: string; secret: string }): boolean {
  const i = args.token.lastIndexOf('.')
  if (i <= 0 || i === args.token.length - 1) return false
  const nonce = args.token.slice(0, i)
  const sigHex = args.token.slice(i + 1)
  const expected = crypto.createHmac('sha256', args.secret).update(nonce).digest()
  const actual = Buffer.from(sigHex, 'hex')
  if (actual.length !== expected.length) return false
  return crypto.timingSafeEqual(actual, expected)
}

export type GrantCheck = { ok: true } | { ok: false; reason: 'expired' | 'limit' }

export function evaluateGrant(
  grant: { expiresAt: string | Date; uses: number; maxUses: number },
  now: Date,
): GrantCheck {
  if (new Date(grant.expiresAt).getTime() <= now.getTime()) return { ok: false, reason: 'expired' }
  if (grant.uses >= grant.maxUses) return { ok: false, reason: 'limit' }
  return { ok: true }
}
