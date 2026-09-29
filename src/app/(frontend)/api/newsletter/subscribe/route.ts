import { NextRequest, NextResponse } from 'next/server'
import { brevoDoubleOptin } from '@/utilities/brevoContacts'
import { createRateLimiter } from '@/utilities/rateLimit'

/**
 * POST /api/newsletter/subscribe — Brevo double opt-in for a named list.
 *
 * Two entry shapes, one path:
 *  - JSON: the platform's own forms (BrevoSignup block, NewsletterForm) → JSON reply.
 *  - form POST (application/x-www-form-urlencoded): external static landings
 *    (stronaw5dni.pl) submit a plain <form>; the reply is a 303 to `next`.
 *
 * `source` picks the Brevo list + DOI template SERVER-SIDE. The client can no
 * longer name a list id — the old `listId` body field let anyone subscribe a
 * victim to any list of this account. Unknown source → 400.
 *
 * Redirect targets (`next` after submit, `confirmed` after the DOI click) are
 * accepted only for allow-listed origins; anything else silently falls back to
 * the platform defaults, so this route cannot be used as an open redirector.
 *
 * Abuse controls mirror /api/free-claim: honeypot field, per-IP, per-email and
 * global caps. Replies never reveal whether the address already existed.
 */

type Source = { listId: string | undefined; templateId: string | undefined }
const SOURCES: Record<string, () => Source> = {
  newsletter: () => ({
    listId: process.env.BREVO_LIST_ID,
    templateId: process.env.BREVO_DOI_TEMPLATE_ID,
  }),
  lekcja: () => ({
    listId: process.env.BREVO_LESSON_LIST_ID,
    templateId: process.env.BREVO_LESSON_DOI_TEMPLATE_ID,
  }),
}

// Answer to "co masz dziś" on the lesson signup; stored as the PROJEKT contact
// attribute so the list can be segmented before the lesson.
const PROJEKT_VALUES = new Set(['lokalnie', 'nic', 'hosting'])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const perIp = createRateLimiter({ max: 5, windowMs: 10 * 60_000 })
const perEmail = createRateLimiter({ max: 3, windowMs: 24 * 60 * 60_000 })
const globalCap = createRateLimiter({ max: 100, windowMs: 24 * 60 * 60_000 })

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
}

/** Origins that `next` / `confirmed` may point at: the platform itself plus
 *  NEWSLETTER_REDIRECT_ORIGINS (comma-separated, e.g. https://stronaw5dni.pl). */
function allowedOrigins(): Set<string> {
  const out = new Set<string>()
  try {
    out.add(new URL(siteUrl()).origin)
  } catch {
    /* unparseable NEXT_PUBLIC_SERVER_URL: only the env list applies */
  }
  for (const raw of (process.env.NEWSLETTER_REDIRECT_ORIGINS ?? '').split(',')) {
    const s = raw.trim()
    if (!s) continue
    try {
      out.add(new URL(s).origin)
    } catch {
      /* skip malformed entries */
    }
  }
  return out
}

function safeRedirect(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return null
  try {
    const u = new URL(value)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    return allowedOrigins().has(u.origin) ? u.toString() : null
  } catch {
    return null
  }
}

type Parsed = {
  email: unknown
  source: unknown
  projekt: unknown
  honeypot: unknown
  next: unknown
  confirmed: unknown
}

async function parseBody(req: NextRequest): Promise<{ body: Parsed; isForm: boolean } | null> {
  const isForm = (req.headers.get('content-type') ?? '').includes(
    'application/x-www-form-urlencoded',
  )
  try {
    if (isForm) {
      const f = await req.formData()
      return {
        isForm,
        body: {
          email: f.get('email'),
          source: f.get('source'),
          projekt: f.get('projekt'),
          honeypot: f.get('website'),
          next: f.get('next'),
          confirmed: f.get('confirmed'),
        },
      }
    }
    const j = (await req.json()) as Record<string, unknown>
    return {
      isForm,
      body: {
        email: j.email,
        source: j.source,
        projekt: j.projekt,
        honeypot: j.website,
        next: j.next,
        confirmed: j.confirmed,
      },
    }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request)
  if (!parsed) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  const { body, isForm } = parsed

  const sourceKey = typeof body.source === 'string' && body.source ? body.source : 'newsletter'
  const resolve = SOURCES[sourceKey]
  if (!resolve) return NextResponse.json({ error: 'Unknown source' }, { status: 400 })
  const source = resolve()
  if (!process.env.BREVO_API_KEY || !source.listId || !source.templateId) {
    console.error(`[newsletter] source "${sourceKey}" not configured`)
    return NextResponse.json({ error: 'Newsletter service not configured' }, { status: 503 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
  }

  const next = isForm ? safeRedirect(body.next) : null
  const ok = () =>
    isForm && next
      ? NextResponse.redirect(next, 303)
      : NextResponse.json(
          { message: 'Please check your email to confirm your subscription' },
          { status: 200 },
        )

  // Honeypot: bots fill every field. Pretend success, send nothing.
  if (typeof body.honeypot === 'string' && body.honeypot.trim() !== '') return ok()

  if (!globalCap.check('global') || !perIp.check(clientIp(request)) || !perEmail.check(email)) {
    const masked = email.replace(/(.).*(@.*)/, '$1…$2')
    console.log(JSON.stringify({ event: 'newsletter_rate_limited', source: sourceKey, email: masked }))
    return NextResponse.json({ error: 'Too many requests, try again later' }, { status: 429 })
  }

  const attributes: Record<string, unknown> = {}
  if (typeof body.projekt === 'string' && PROJEKT_VALUES.has(body.projekt)) {
    attributes.PROJEKT = body.projekt
  }

  const sent = await brevoDoubleOptin({
    email,
    listId: Number(source.listId),
    templateId: source.templateId,
    redirectionUrl: safeRedirect(body.confirmed) ?? `${siteUrl()}/newsletter/confirmed`,
    attributes,
  })
  if (!sent) {
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again later.' },
      { status: 500 },
    )
  }
  return ok()
}

export const dynamic = 'force-dynamic'
