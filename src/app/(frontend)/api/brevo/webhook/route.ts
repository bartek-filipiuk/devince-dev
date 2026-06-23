import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { mapBrevoEvent, shouldUpgrade, type EmailStatus } from '@/utilities/brevoEvents'

export const dynamic = 'force-dynamic'

/**
 * Brevo transactional event webhook → advances a download grant's `emailStatus`
 * (delivered / opened / bounced / ...) so the admin sees delivery state in Payload
 * without leaving for Brevo. Brevo doesn't sign transactional webhooks, so the
 * endpoint is gated by a shared secret (configure the Brevo webhook URL with
 * `?secret=<BREVO_WEBHOOK_SECRET>`). Always returns 200 on authed requests so a
 * stray/unknown message-id doesn't trigger Brevo's retry storm.
 */
function authed(request: NextRequest): boolean {
  const secret = process.env.BREVO_WEBHOOK_SECRET
  if (!secret) return false
  const provided =
    request.nextUrl.searchParams.get('secret') ?? request.headers.get('x-brevo-secret') ?? ''
  // HMAC both sides to normalize length before the timing-safe compare.
  const a = crypto.createHmac('sha256', secret).update(provided).digest()
  const b = crypto.createHmac('sha256', secret).update(secret).digest()
  return crypto.timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  if (!authed(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  // Brevo may POST a single event object or an array of them.
  const events = Array.isArray(body) ? body : [body]
  const payload = await getPayload({ config: configPromise })

  for (const ev of events) {
    if (!ev || typeof ev !== 'object') continue
    const e = ev as Record<string, unknown>
    const eventName = typeof e.event === 'string' ? e.event : ''
    const messageId = typeof e['message-id'] === 'string' ? (e['message-id'] as string) : ''
    const next = mapBrevoEvent(eventName)
    if (!next || !messageId) continue

    try {
      const found = await payload.find({
        collection: 'download-grants',
        where: { emailMessageId: { equals: messageId } },
        limit: 1,
        overrideAccess: true,
      })
      const grant = found.docs[0] as { id: number | string; emailStatus?: EmailStatus } | undefined
      if (grant && shouldUpgrade(grant.emailStatus, next)) {
        await payload.update({
          collection: 'download-grants',
          id: grant.id,
          data: { emailStatus: next } as never,
          overrideAccess: true,
        })
      }
    } catch {
      // Best-effort per event — never fail the whole webhook on one bad row.
    }
  }

  return NextResponse.json({ received: true })
}
