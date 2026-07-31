import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { createRateLimiter } from '@/utilities/rateLimit'

/**
 * GET /api/apps/session-grant?session_id=cs_… — resolve a finished Checkout
 * Session to its DownloadGrant token, so the success page can offer the file
 * immediately instead of only pointing at the email.
 *
 * WHY THIS EXISTS: apps is account-less. Before this route the ONLY delivery
 * channel was the download email — if it bounced or landed in spam, a paying
 * customer had no self-service way to reach the file they had just bought.
 * This is a second, independent route to the same grant.
 *
 * SECURITY POSTURE: presenting the session id yields the download token. That id
 * is unguessable (`cs_live_` + ~58 chars) and reaches only the buyer's own
 * browser via Stripe's redirect, so this is the same risk class as the emailed
 * link — NOT a new authorization boundary. The token stays HMAC-signed, expiring
 * and use-capped, and `/download/[token]` re-validates all of that. We add:
 *  - a shape check, so malformed input never reaches the DB,
 *  - a per-IP rate limit, so the id space cannot be probed in bulk,
 *  - a response carrying ONLY {ready, token} — never the buyer's email, amount
 *    or any other grant field.
 *
 * The grant is created by the Stripe webhook, which may land AFTER the buyer is
 * redirected here. `ready:false` is therefore a normal, expected state, not an
 * error — the caller polls, and falls back to the email message on timeout.
 */

// Stripe session ids: `cs_` + live/test prefix + base58-ish body. We only need
// enough to reject junk before spending a DB round-trip.
const SESSION_ID_RE = /^cs_[A-Za-z0-9_]{10,255}$/

// Probing is the only reason to call this route repeatedly with different ids;
// a real buyer polls ONE id a handful of times while the webhook lands.
const perIp = createRateLimiter({ max: 30, windowMs: 5 * 60_000 })

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId || !SESSION_ID_RE.test(sessionId)) {
    return NextResponse.json({ error: 'invalid session_id' }, { status: 400 })
  }

  if (!perIp.check(clientIp(req))) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429 })
  }

  const payload = await getPayload({ config: configPromise })
  const found = await payload.find({
    collection: 'download-grants',
    where: { stripeSessionId: { equals: sessionId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const grant = found.docs[0] as { token?: string } | undefined
  if (!grant?.token) {
    // Webhook not in yet (or unknown id — deliberately indistinguishable).
    return NextResponse.json({ ready: false })
  }

  return NextResponse.json({ ready: true, token: grant.token })
}

export const dynamic = 'force-dynamic'
