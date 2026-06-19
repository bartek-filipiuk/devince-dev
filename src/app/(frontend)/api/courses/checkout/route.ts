import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { buildLineItem } from '@/utilities/checkoutLineItem'
import { notifyEvent } from '@/utilities/notify'

// Lazy-init: constructing Stripe at module scope throws if STRIPE_SECRET_KEY is
// unset, which would crash Next.js's build-time "collect page data" step. Defer
// it to the first request so the module loads without keys present.
// apiVersion intentionally omitted — the SDK defaults to the account's pinned
// API version, which is correct for checkout (we only create sessions and read
// back `url` + `id`, both stable). Pinning a literal version here would just
// risk drift against the dashboard.
let stripeClient: Stripe | null = null
function getStripe(): Stripe {
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string)
  return stripeClient
}

const COURSES_URL = () => process.env.NEXT_PUBLIC_COURSES_URL ?? 'https://courses.devince.dev'

export async function POST(req: NextRequest) {
  let slug: unknown
  let consent: unknown
  let locale: unknown
  try {
    ;({ slug, consent, locale } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  if (typeof slug !== 'string' || !slug) return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  // Drives only the language of the confirmation email — not a trust boundary,
  // so a bad value harmlessly falls back to 'pl'.
  const emailLocale = locale === 'en' ? 'en' : 'pl'

  // Art. 38 pkt 13 ustawy o prawach konsumenta: course access is supplied
  // immediately, so the buyer must give express prior consent to begin delivery
  // AND acknowledge losing the right of withdrawal. The checkout UI gates the
  // button on a separate checkbox, but THIS server-side check is the actual
  // legal gate — a scripted request without consent must never reach Stripe.
  if (consent !== true) {
    return NextResponse.json({ error: 'consent required' }, { status: 400 })
  }
  // Server-stamped, never trusting a client-supplied time. This is the moment
  // consent was recorded; it flows to the grant + the durable-medium email.
  const withdrawalConsentAt = new Date().toISOString()

  const payload = await getPayload({ config: configPromise })
  // overrideAccess: false + no user => only published programs are findable.
  const found = await payload.find({
    collection: 'program',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
  })
  const program = found.docs[0]
  if (!program) return NextResponse.json({ error: 'not found' }, { status: 404 })
  // Only paid programs with a way to price the line item are purchasable: a
  // Stripe Price ID, or a numeric priceCents (+ currency) to build price_data.
  const hasStripePrice = typeof program.stripePriceId === 'string' && program.stripePriceId.length > 0
  const hasInlinePrice = typeof program.priceCents === 'number'
  if (program.pricing !== 'paid' || (!hasStripePrice && !hasInlinePrice)) {
    return NextResponse.json({ error: 'not purchasable' }, { status: 400 })
  }

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      buildLineItem({
        title: program.title,
        // Program's priceCents/currency are nullable in the schema, but the
        // guard above proved we either have a stripePriceId (these are then
        // ignored) or a numeric priceCents — so the `?? 0`/`?? 'pln'` fallbacks
        // are never the load-bearing path.
        priceCents: program.priceCents ?? 0,
        currency: program.currency ?? 'pln',
        stripePriceId: program.stripePriceId,
      }),
    ],
    metadata: {
      // The webhook's course branch keys on `programId` to grant access.
      programId: String(program.id),
      // Audit marker visible in the Stripe dashboard. NOT re-validated at
      // fulfillment — `withdrawalConsentAt` is the load-bearing field (its
      // presence == consent given). Kept because Stripe is itself a durable
      // record of the transaction + the consent moment.
      withdrawalConsent: 'true',
      withdrawalConsentAt,
      locale: emailLocale,
    },
    success_url: `${COURSES_URL()}/success`,
    cancel_url: `${COURSES_URL()}/${program.slug}`,
  })

  // Observability: server-side checkout_start ping. Best-effort — notifyEvent
  // never throws, so this cannot change the response or block the redirect.
  await notifyEvent('checkout_start', {
    surface: 'courses',
    slug,
    item: program.title,
    amount: typeof program.priceCents === 'number' ? program.priceCents : undefined,
    currency: program.currency ?? 'pln',
  })

  return NextResponse.json({ url: session.url })
}

export const dynamic = 'force-dynamic'
