import crypto from 'crypto'

/**
 * HMAC-signed CLAIM tokens — the SECURITY BOUNDARY for free lead-magnet access.
 *
 * A lead-magnet "confirm" click grants REAL access (a download grant / course
 * enrolment) WITHOUT payment. The claim token is the ONLY thing that authorises
 * that grant, so it must be UNFORGEABLE: it binds `{kind,itemId,email}` under an
 * HMAC keyed by the server-only `CLAIM_TOKEN_SECRET`. Without the secret an
 * attacker cannot mint a token for an item they didn't pay for, nor swap the
 * itemId/email of a token they were legitimately issued.
 *
 * The token reaches ONLY the email owner: it rides inside the Brevo double
 * opt-in `redirectionUrl`, so it is delivered exclusively to the address that
 * clicked Brevo's confirmation link (same trust model as a magic link).
 *
 * Token format: "<base64url(json payload)>.<hmacSha256Hex(body, secret)>".
 * verify recomputes the HMAC over the EXACT base64url body it received and
 * timing-safe-compares — a tampered body (e.g. forged to a pricier item) yields
 * a different HMAC and is rejected. Single-use is enforced SEPARATELY by the
 * `claim-grants` unique index at the confirm route; this module only proves
 * authenticity + integrity.
 */

export type ClaimKind = 'app' | 'course'
export type ClaimPayload = { kind: ClaimKind; itemId: string; email: string }

function getSecret(): string {
  const secret = process.env.CLAIM_TOKEN_SECRET
  if (!secret) throw new Error('CLAIM_TOKEN_SECRET is not set')
  return secret
}

/**
 * Sign a claim. THROWS if `CLAIM_TOKEN_SECRET` is unset — a missing secret is a
 * server misconfiguration that must fail loudly at the point of issuance (the
 * free-claim route), never silently mint an unverifiable token.
 */
export function signClaim(payload: ClaimPayload): string {
  const secret = getSecret()
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return `${body}.${sig}`
}

/**
 * Verify + parse a claim token. Returns the payload ONLY when the HMAC checks
 * out AND the payload has a valid shape; returns `null` for anything else.
 *
 * NEVER throws — malformed input, a missing secret, bad base64, non-JSON, an
 * unexpected shape, or a signature mismatch all fail CLOSED to `null`. The
 * confirm route treats `null` as "no grant". The HMAC compare is timing-safe.
 */
export function verifyClaim(token: string): ClaimPayload | null {
  try {
    const secret = process.env.CLAIM_TOKEN_SECRET
    if (!secret) return null // fail closed: cannot verify => no grant
    if (typeof token !== 'string') return null

    const i = token.lastIndexOf('.')
    if (i <= 0 || i === token.length - 1) return null
    const body = token.slice(0, i)
    const sigHex = token.slice(i + 1)

    // Recompute the HMAC over the received body and timing-safe compare.
    const expected = crypto.createHmac('sha256', secret).update(body).digest()
    let actual: Buffer
    try {
      actual = Buffer.from(sigHex, 'hex')
    } catch {
      return null
    }
    // A non-hex sig of the wrong byte length must be rejected before
    // timingSafeEqual (which throws on length mismatch). Also reject when the
    // input wasn't clean hex (Buffer.from silently drops odd/invalid chars).
    if (actual.length !== expected.length) return null
    if (actual.toString('hex') !== sigHex.toLowerCase()) return null
    if (!crypto.timingSafeEqual(actual, expected)) return null

    // Signature OK → decode + validate the payload shape. A valid HMAC over a
    // structurally-wrong payload still yields null (defence in depth).
    let parsed: unknown
    try {
      parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    } catch {
      return null
    }
    if (!isClaimPayload(parsed)) return null
    return parsed
  } catch {
    // Belt-and-braces: nothing above should throw, but a verify path for a
    // free-access grant must NEVER surface an exception as an error page.
    return null
  }
}

function isClaimPayload(v: unknown): v is ClaimPayload {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    (o.kind === 'app' || o.kind === 'course') &&
    typeof o.itemId === 'string' &&
    o.itemId.length > 0 &&
    typeof o.email === 'string' &&
    o.email.length > 0
  )
}
