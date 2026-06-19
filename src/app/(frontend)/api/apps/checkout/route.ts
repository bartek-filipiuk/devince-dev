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

const APPS_URL = () => process.env.NEXT_PUBLIC_APPS_URL ?? 'https://apps.devince.dev'

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
  // Drives only the language of the download/confirmation email — not a trust
  // boundary, so a bad value harmlessly falls back to 'pl'.
  const emailLocale = locale === 'en' ? 'en' : 'pl'

  // Art. 38 pkt 13 ustawy o prawach konsumenta: a digital download is supplied
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
  // overrideAccess: false + no user => only published products are findable.
  const found = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
  })
  const product = found.docs[0]
  if (!product) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const files = Array.isArray(product.downloadFiles) ? product.downloadFiles : []
  if (!files.length) return NextResponse.json({ error: 'not purchasable' }, { status: 409 })

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      buildLineItem({
        title: product.title,
        priceCents: product.priceCents,
        currency: product.currency,
        stripePriceId: product.stripePriceId,
      }),
    ],
    metadata: {
      productId: String(product.id),
      // Audit marker visible in the Stripe dashboard. NOT re-validated at
      // fulfillment — `withdrawalConsentAt` is the load-bearing field (its
      // presence == consent given). Kept because Stripe is itself a durable
      // record of the transaction + the consent moment.
      withdrawalConsent: 'true',
      withdrawalConsentAt,
      locale: emailLocale,
    },
    success_url: `${APPS_URL()}/success`,
    cancel_url: `${APPS_URL()}/${product.slug}`,
  })

  // Observability: server-side checkout_start ping. Best-effort — notifyEvent
  // never throws, so this cannot change the response or block the redirect.
  await notifyEvent('checkout_start', {
    surface: 'apps',
    slug,
    item: product.title,
    amount: typeof product.priceCents === 'number' ? product.priceCents : undefined,
    currency: product.currency ?? 'pln',
  })

  return NextResponse.json({ url: session.url })
}

export const dynamic = 'force-dynamic'
