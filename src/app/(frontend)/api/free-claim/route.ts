import { NextRequest, NextResponse } from 'next/server'
import { claimLeadMagnet } from '@/utilities/freeClaim'

/**
 * POST /api/free-claim — lead-magnet email capture (grants NO access).
 *
 * Body: `{ surface:'apps'|'courses', slug, email, newsletter? }`.
 *
 * CONSENT (art. 6(1)(b) + 7(4) GDPR, art. 398 PKE): the material is delivered
 * unconditionally; newsletter membership is a SEPARATE opt-in. Brevo's DOI API
 * always adds the contact to some list (`includeListIds` is mandatory), so the
 * confirm mail goes through a claims-only list (`BREVO_LEADMAGNET_LIST_ID`, never
 * used for campaigns) unless `newsletter === true` (strict boolean), in which
 * case it goes to the newsletter list (`BREVO_LIST_ID`), exactly like the paid
 * checkout's newsletter box. Anything else ("true", 1, "on", missing) = NOT
 * subscribed.
 *
 * SECURITY POSTURE (this is the entry to a FREE-access flow):
 *  - The item is loaded with `overrideAccess:false` so ONLY published items are
 *    findable, and its `accessMode` is re-checked SERVER-SIDE here — the client
 *    can never coax a paid item into the free path.
 *  - The signed claim token binds the REAL item id (from the DB record, not the
 *    request) + the submitted email. It is delivered ONLY inside Brevo's DOI
 *    email (the redirectionUrl), so it reaches only the address that confirms.
 *  - Rate-limited per IP+email to blunt a DOI email-bomb (spamming confirmation
 *    emails to arbitrary addresses).
 *  - The response is a neutral 200 `{ok:true}` on success — no email enumeration
 *    (we never reveal whether the contact already existed). 404/400 distinguish
 *    only unknown vs non-lead-magnet ITEM, which is public storefront info.
 */

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

export async function POST(req: NextRequest) {
  let surface: unknown
  let slug: unknown
  let email: unknown
  let newsletter: unknown
  try {
    ;({ surface, slug, email, newsletter } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  if (surface !== 'apps' && surface !== 'courses') {
    return NextResponse.json({ error: 'invalid surface' }, { status: 400 })
  }
  if (typeof slug !== 'string' || !slug) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const result = await claimLeadMagnet({
    surface,
    slug,
    email: typeof email === 'string' ? email : '',
    newsletter: newsletter === true,
    ip: clientIp(req),
    source: 'leadmagnet',
  })
  // Neutral success — no email enumeration.
  return result.status === 200
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.error }, { status: result.status })
}

export const dynamic = 'force-dynamic'
