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
  let newsletter: unknown
  let tierIndex: unknown
  try {
    ;({ slug, consent, locale, newsletter, tierIndex } = await req.json())
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
    depth: 1,
    overrideAccess: false,
  })
  const product = found.docs[0]
  if (!product) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const files = Array.isArray(product.downloadFiles) ? product.downloadFiles : []
  if (!files.length) return NextResponse.json({ error: 'not purchasable' }, { status: 409 })

  // ── Tier-price selection (SECURITY-CRITICAL) ──────────────────────────────
  // If the product has tiers, the price MUST be derived from the server-side
  // tier record. We never trust a client-sent price or price ID. The client
  // sends only `tierIndex` (an integer 0-based index); we validate it strictly
  // and then read the price exclusively from the DB row.
  const productTiers = Array.isArray(product.tiers) ? product.tiers : []
  let lineItemPriceCents: number
  let lineItemCurrency: string
  let lineItemStripePriceId: string | null | undefined
  let tierName: string | undefined

  if (productTiers.length > 0) {
    // Tiered product — tierIndex is required and must be a valid in-range integer.
    const idx = typeof tierIndex === 'number' ? Math.trunc(tierIndex) : NaN
    if (!Number.isFinite(idx) || idx < 0 || idx >= productTiers.length) {
      return NextResponse.json(
        { error: 'tierIndex missing or out of range' },
        { status: 400 },
      )
    }
    const tier = productTiers[idx]
    // Defensive: tier data comes from DB, but guard anyway.
    if (typeof tier.priceCents !== 'number' || tier.priceCents < 0) {
      return NextResponse.json({ error: 'tier price invalid' }, { status: 500 })
    }
    lineItemPriceCents = tier.priceCents
    lineItemCurrency = tier.currency ?? 'usd'
    // Tiers do not support individual Stripe Price IDs (by design — one product
    // ID, multiple license levels). Always build price_data so the Stripe
    // Dashboard shows the correct per-tier amount.
    lineItemStripePriceId = null
    tierName = tier.name
  } else {
    // No tiers — single-price product, existing behavior unchanged.
    lineItemPriceCents = product.priceCents
    lineItemCurrency = product.currency
    lineItemStripePriceId = product.stripePriceId
  }

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      buildLineItem({
        title: product.title,
        priceCents: lineItemPriceCents,
        currency: lineItemCurrency,
        stripePriceId: lineItemStripePriceId,
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
      // Tier name recorded for license tracking (webhook + Stripe Dashboard).
      // The downloadable file is the same for all tiers; this is how we know
      // which license the buyer purchased. Never used to re-derive the price.
      ...(tierName ? { tier: tierName } : {}),
      // Server-chosen price stamped into the session so the webhook can reconcile
      // the exact amount (including tier prices) without re-deriving it from the
      // root product fields. The root `priceCents` is 0 for tiered products, which
      // would make the old webhook gate a no-op for any tier purchase.
      // Only set when we have an inline amount (not a Stripe Price ID path — see
      // comment in the single-price branch); the webhook falls back to its prior
      // root-priceCents / stripePriceId logic when these keys are absent.
      ...(typeof lineItemPriceCents === 'number' && !lineItemStripePriceId
        ? {
            expectedCents: String(lineItemPriceCents),
            expectedCurrency: lineItemCurrency,
          }
        : {}),
      // Newsletter opt-in (separate from the Art. 38 consent above, never gates
      // the purchase, never affects price). Stamped only when the buyer ticked
      // the box; the webhook reads it post-grant to fire a Brevo double opt-in.
      ...(newsletter === true ? { newsletter: 'true' } : {}),
    },
    success_url: `${APPS_URL()}/success`,
    cancel_url: `${APPS_URL()}/${product.slug}`,
  })

  // Observability: server-side checkout_start ping. Best-effort — notifyEvent
  // never throws, so this cannot change the response or block the redirect.
  await notifyEvent('checkout_start', {
    surface: 'apps',
    slug,
    item: tierName ? `${product.title} · ${tierName}` : product.title,
    amount: lineItemPriceCents,
    currency: lineItemCurrency,
  })

  return NextResponse.json({ url: session.url })
}

export const dynamic = 'force-dynamic'
