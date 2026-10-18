import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { signClaim, type ClaimKind } from './claimToken'
import { createRateLimiter, ipKey } from './rateLimit'

/**
 * Lead-magnet claim shared by POST /api/free-claim (the package page form) and the
 * channel MCP's claim_package tool: one implementation, one set of barriers, one
 * set of counters. Consent and security notes: see the free-claim route.
 */

// Module-scoped so windows persist across requests in this process. v1 is
// single-instance; see rateLimit.ts for the multi-instance note.
//
// THREE INDEPENDENT BARRIERS. The original single limiter keyed on (IP+email)
// and was useless against the very attack it was written for: a bot supplying a
// DIFFERENT address on every request gets a NEW key each time, so the counter
// never rises. Not theoretical — on 2026-07-31 this endpoint was used for signup
// bombing: 49 confirmation emails to 22 strangers in 11 hours, one address hit
// 15 times. Each barrier closes a distinct escape route:
//
//   perIp     — one source cannot fan out across many addresses
//   perEmail  — a victim cannot be serialised no matter how many IPs are used
//   globalCap — a distributed bot still hits a ceiling (circuit breaker)
//
// Shared-NAT users are the known cost of perIp; at 5 per 10 min a human never
// notices. perEmail is the barrier that actually protects third parties.
const perIp = createRateLimiter({ max: 5, windowMs: 10 * 60_000 })
const perEmail = createRateLimiter({ max: 3, windowMs: 24 * 60 * 60_000 })
const globalCap = createRateLimiter({ max: 50, windowMs: 24 * 60 * 60_000 })

// Conservative email shape check. Not RFC-perfect (impossible by regex); enough
// to reject obvious garbage before we spend a DB lookup + a Brevo call on it.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const HOST: Record<'apps' | 'courses', () => string> = {
  apps: () => process.env.NEXT_PUBLIC_APPS_URL ?? 'https://apps.devince.dev',
  courses: () => process.env.NEXT_PUBLIC_COURSES_URL ?? 'https://courses.devince.dev',
}

export type ClaimInput = {
  surface: 'apps' | 'courses'
  slug: string
  email: string
  newsletter: boolean
  ip: string
  /** Brevo SOURCE attribute: where the claim came from ('leadmagnet' form, 'mcp'). */
  source: string
}
export type ClaimResult = { status: 200 } | { status: 400 | 404 | 429 | 503; error: string }

export async function claimLeadMagnet(input: ClaimInput): Promise<ClaimResult> {
  const { surface, slug, newsletter, ip, source } = input
  const normalizedEmail = input.email.trim().toLowerCase()
  if (!EMAIL_RE.test(normalizedEmail) || normalizedEmail.length > 254) {
    return { status: 400, error: 'invalid email' }
  }

  // Env gate: with no DOI template the whole lead-magnet flow is a no-op (the
  // brevoDoubleOptin util would silently skip and the user would never get a
  // confirm email). Surface that as a clear 503 rather than a misleading 200 so
  // the UI can show "not available yet" and the owner knows to set the env.
  // Own template so the confirm mail talks about the download, not the newsletter;
  // falls back to the shared newsletter DOI template until the owner creates one.
  const doiTemplateId =
    process.env.BREVO_LEADMAGNET_DOI_TEMPLATE_ID || process.env.BREVO_DOI_TEMPLATE_ID
  if (!doiTemplateId) {
    return { status: 503, error: 'lead magnets not configured' }
  }
  // Same gate for the target list: a missing claims list must NEVER fall back to
  // the newsletter list (that would re-bundle the consent this route separates).
  const subscribe = newsletter === true
  const listId = Number(
    subscribe ? process.env.BREVO_LIST_ID : process.env.BREVO_LEADMAGNET_LIST_ID,
  )
  if (!Number.isInteger(listId) || listId <= 0) {
    return { status: 503, error: 'lead magnets not configured' }
  }

  // Rate-limit BEFORE the DB/Brevo work. Short-circuit order matters: a request
  // rejected by an earlier barrier must not consume budget in the later ones,
  // otherwise a blocked flood would burn the global cap and lock out real users.
  if (!perIp.check(ipKey(ip)) || !perEmail.check(normalizedEmail) || !globalCap.check('*')) {
    // Masked so the log never carries a third party's full address — under an
    // attack these are victims' inboxes, not our users'.
    console.warn(
      JSON.stringify({
        event: 'free_claim_rate_limited',
        source,
        ip,
        email: normalizedEmail.replace(/(.).*(@.*)/, '$1…$2'),
        slug,
      }),
    )
    return { status: 429, error: 'too many requests' }
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
  if (!item) return { status: 404, error: 'not found' }

  // SERVER-SIDE re-check: only a lead-magnet item may be claimed for free. A
  // 'paid' (or unset/legacy) accessMode is rejected — the client cannot make a
  // paid item free by hitting this route.
  if (item.accessMode !== 'lead-magnet') {
    return { status: 400, error: 'not a lead magnet' }
  }

  const kind: ClaimKind = surface === 'apps' ? 'app' : 'course'
  // signClaim throws if CLAIM_TOKEN_SECRET is unset — that's a server misconfig
  // (the controller sets it alongside BREVO_DOI_TEMPLATE_ID). Surface as 503.
  let token: string
  try {
    token = signClaim({ kind, itemId: String(item.id), email: normalizedEmail })
  } catch {
    return { status: 503, error: 'lead magnets not configured' }
  }

  const redirectionUrl = `${HOST[surface]()}/claim/confirmed?grant=${encodeURIComponent(token)}`

  // Best-effort DOI (never throws). The contact is added to `listId` + access is
  // granted only when the user clicks Brevo's confirmation link → /claim/confirmed.
  const { brevoDoubleOptin } = await import('@/utilities/brevoContacts')
  await brevoDoubleOptin({
    email: normalizedEmail,
    listId,
    templateId: doiTemplateId,
    redirectionUrl,
    attributes: { SOURCE: source, PRODUCT: slug, SURFACE: surface },
  })

  return { status: 200 }
}
