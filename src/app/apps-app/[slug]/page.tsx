import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import type { Media, Product } from '@/payload-types'
import type { Locale } from '@/i18n'
import { formatPrice } from '@/utilities/formatPrice'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { getLocale } from '@/utilities/getLocale.server'
import { t } from '@/i18n'
import RichText from '@/components/RichText'
import { BuyButton } from '../_components/BuyButton'
import { AppLeadMagnet } from '../_components/AppLeadMagnet'
import { ProductTierSelector } from '../_components/ProductTierSelector'

export const dynamic = 'force-dynamic'

async function getProduct(slug: string, locale: Locale): Promise<Product | null> {
  const payload = await getPayload({ config: configPromise })

  const res = await payload.find({
    collection: 'products',
    where: {
      and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
    },
    limit: 1,
    overrideAccess: false,
    depth: 1,
    locale,
  })

  return (res.docs[0] as Product) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  const product = await getProduct(slug, locale)
  if (!product) return { title: t(locale, 'apps.product.metaNotFound') }

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
  const locale = await getLocale()
  const product = await getProduct(slug, locale)
  if (!product) notFound()

  const cover =
    product.coverImage && typeof product.coverImage === 'object'
      ? (product.coverImage as Media)
      : null
  const coverUrl = cover ? getMediaUrl(cover.url) : null

  const files = product.downloadFiles ?? []
  // Lead magnet (free-for-email): render the email capture form instead of the
  // paid buy control + price. The free-claim/confirm routes re-validate this
  // server-side from the DB record — the client can't make a paid item free.
  const leadMagnet = product.accessMode === 'lead-magnet'

  return (
    <article>
      {/* Hero */}
      <header className="hero" id="hero">
        <div className="shell">
          <div className="product-hero">
            <div className="product-hero__content">
              <span className="eyebrow">
                <i>{t(locale, 'apps.product.eyebrow')}</i>
              </span>
              <h1>{product.title}</h1>

              <div className="product-buy">
                {leadMagnet ? (
                  <AppLeadMagnet slug={product.slug} locale={locale} />
                ) : product.tiers && product.tiers.length > 0 ? (
                  <ProductTierSelector
                    slug={product.slug}
                    tiers={product.tiers}
                    disabled={files.length === 0}
                    chooseLicenseLabel={t(locale, 'apps.product.chooseLicense')}
                    recommendedLabel={t(locale, 'apps.product.recommended')}
                    buyLabel={t(locale, 'apps.product.buy')}
                    processingLabel={t(locale, 'apps.product.processing')}
                    errorLabel={t(locale, 'apps.product.error')}
                    consentLabel={t(locale, 'apps.product.consent')}
                    newsletterLabel={t(locale, 'apps.checkout.newsletter')}
                    noteLabel={t(locale, 'apps.product.note')}
                  />
                ) : (
                  <>
                    <p className="product-price">
                      {formatPrice(product.priceCents, product.currency)}
                    </p>
                    <BuyButton
                      slug={product.slug}
                      locale={locale}
                      label={t(locale, 'apps.product.buy')}
                      processingLabel={t(locale, 'apps.product.processing')}
                      errorLabel={t(locale, 'apps.product.error')}
                      consentLabel={t(locale, 'apps.product.consent')}
                      newsletterLabel={t(locale, 'apps.checkout.newsletter')}
                      disabled={files.length === 0}
                    />
                    <p className="product-note">{t(locale, 'apps.product.note')}</p>
                  </>
                )}
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

      {product.description ? (
        <section className="shell product-detail">
          <div className="product-desc">
            <RichText data={product.description} enableGutter={false} enableProse={false} />
          </div>
        </section>
      ) : null}
    </article>
  )
}
