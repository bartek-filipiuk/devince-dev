import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { signClaim, type ClaimKind } from '@/utilities/claimToken'
import { createRateLimiter } from '@/utilities/rateLimit'

/**
 * POST /api/free-claim — lead-magnet email capture (grants NO access).
 *
 * Body: `{ surface:'apps'|'courses', slug, email }`.
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

// Module-scoped so the window persists across requests in this process. v1 is
// single-instance; see rateLimit.ts for the multi-instance note. 3 hits / minute
// per (IP+email) is enough for a human retrying, far below an email-bomb rate.
const limiter = createRateLimiter({ max: 3, windowMs: 60_000 })

// Conservative email shape check. Not RFC-perfect (impossible by regex); enough
// to reject obvious garbage before we spend a DB lookup + a Brevo call on it.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const HOST: Record<'apps' | 'courses', () => string> = {
  apps: () => process.env.NEXT_PUBLIC_APPS_URL ?? 'https://apps.devince.dev',
  courses: () => process.env.NEXT_PUBLIC_COURSES_URL ?? 'https://courses.devince.dev',
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

export async function POST(req: NextRequest) {
  let surface: unknown
  let slug: unknown
  let email: unknown
  try {
    ;({ surface, slug, email } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  if (surface !== 'apps' && surface !== 'courses') {
    return NextResponse.json({ error: 'invalid surface' }, { status: 400 })
  }
  if (typeof slug !== 'string' || !slug) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(normalizedEmail) || normalizedEmail.length > 254) {
    return NextResponse.json({ error: 'invalid email' }, { status: 400 })
  }

  // Env gate: with no DOI template the whole lead-magnet flow is a no-op (the
  // brevoDoubleOptin util would silently skip and the user would never get a
  // confirm email). Surface that as a clear 503 rather than a misleading 200 so
  // the UI can show "not available yet" and the owner knows to set the env.
  if (!process.env.BREVO_DOI_TEMPLATE_ID) {
    return NextResponse.json({ error: 'lead magnets not configured' }, { status: 503 })
  }

  // Rate-limit BEFORE the DB/Brevo work. Key on IP+email so one IP can't bomb a
  // single victim and one email can't be bombed from one IP.
  const key = `${clientIp(req)}:${normalizedEmail}`
  if (!limiter.check(key)) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429 })
  }

  const payload = await getPayload({ config: configPromise })
  const collection = surface === 'apps' ? 'products' : 'program'
  // overrideAccess:false + no user => only PUBLISHED items are findable.
  const found = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
  })
  const item = found.docs[0] as { id: number | string; accessMode?: unknown } | undefined
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // SERVER-SIDE re-check: only a lead-magnet item may be claimed for free. A
  // 'paid' (or unset/legacy) accessMode is rejected — the client cannot make a
  // paid item free by hitting this route.
  if (item.accessMode !== 'lead-magnet') {
    return NextResponse.json({ error: 'not a lead magnet' }, { status: 400 })
  }

  const kind: ClaimKind = surface === 'apps' ? 'app' : 'course'
  // signClaim throws if CLAIM_TOKEN_SECRET is unset — that's a server misconfig
  // (the controller sets it alongside BREVO_DOI_TEMPLATE_ID). Surface as 503.
  let token: string
  try {
    token = signClaim({ kind, itemId: String(item.id), email: normalizedEmail })
  } catch {
    return NextResponse.json({ error: 'lead magnets not configured' }, { status: 503 })
  }

  const redirectionUrl = `${HOST[surface]()}/claim/confirmed?grant=${encodeURIComponent(token)}`

  // Best-effort DOI (never throws). The contact is added to the list + access is
  // granted only when the user clicks Brevo's confirmation link → /claim/confirmed.
  const { brevoDoubleOptin } = await import('@/utilities/brevoContacts')
  await brevoDoubleOptin({
    email: normalizedEmail,
    listId: Number(process.env.BREVO_LIST_ID),
    templateId: process.env.BREVO_DOI_TEMPLATE_ID,
    redirectionUrl,
    attributes: { SOURCE: 'leadmagnet', PRODUCT: slug, SURFACE: surface },
  })

  // Neutral success — no email enumeration.
  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'
