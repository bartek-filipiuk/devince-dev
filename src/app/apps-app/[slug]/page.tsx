import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import type { Media, Product } from '@/payload-types'
import { formatPrice } from '@/utilities/formatPrice'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import RichText from '@/components/RichText'
import { BuyButton } from '../_components/BuyButton'

export const dynamic = 'force-dynamic'

async function getProduct(slug: string): Promise<Product | null> {
  const payload = await getPayload({ config: configPromise })

  const res = await payload.find({
    collection: 'products',
    where: {
      and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
    },
    limit: 1,
    overrideAccess: false,
    depth: 1,
  })

  return (res.docs[0] as Product) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return { title: 'Produkt nie znaleziony · Devince' }

  const title = product.meta?.title ?? `${product.title} · Devince`
  const description = product.meta?.description ?? undefined

  return { title, description }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()

  const cover =
    product.coverImage && typeof product.coverImage === 'object'
      ? (product.coverImage as Media)
      : null
  const coverUrl = cover ? getMediaUrl(cover.url) : null

  const files = product.downloadFiles ?? []

  return (
    <article>
      {/* Hero */}
      <header className="hero" id="hero">
        <div className="shell">
          <div className="product-hero">
            <div className="product-hero__content">
              <span className="eyebrow">
                <i>produkt</i>
              </span>
              <h1>{product.title}</h1>

              {product.description ? (
                <div className="product-desc">
                  <RichText
                    data={product.description}
                    enableGutter={false}
                    enableProse={false}
                  />
                </div>
              ) : null}

              <div className="product-buy">
                <p className="product-price">
                  {formatPrice(product.priceCents, product.currency)}
                </p>
                <BuyButton slug={product.slug} disabled={files.length === 0} />
                <p className="product-note">
                  Po zakupie wyślemy link do pobrania na Twój e-mail.
                </p>
              </div>
            </div>

            {coverUrl ? (
              <div className="product-hero__cover">
                <img
                  src={coverUrl}
                  alt={cover?.alt ?? product.title}
                  style={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    objectFit: 'cover',
                    borderRadius: 'var(--r-card)',
                    display: 'block',
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </header>
    </article>
  )
}
