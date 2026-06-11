import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { buildLineItem } from '@/utilities/checkoutLineItem'

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
  try {
    ;({ slug } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  if (typeof slug !== 'string' || !slug) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

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
    metadata: { productId: String(product.id) },
    success_url: `${APPS_URL()}/success`,
    cancel_url: `${APPS_URL()}/${product.slug}`,
  })
  return NextResponse.json({ url: session.url })
}

export const dynamic = 'force-dynamic'
