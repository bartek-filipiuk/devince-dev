import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import type { Media } from '@/payload-types'
import { formatPrice } from '@/utilities/formatPrice'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { t } from '@/i18n'
import { Pagination } from '../courses-app/_components/Pagination'
import { hueFromString, monogram, cheapestTier, firstLineFromLexical } from './_lib/storeCard'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return { title: t(locale, 'apps.store.meta') }
}

const PER_PAGE = 12

/**
 * Apps storefront for apps.devince.dev — a paginated list of published
 * digital products (cover image, title, price). Cards link to /<slug>.
 */
export default async function AppsStorefront({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)
  const locale = await getLocale()

  const payload = await getPayload({ config: configPromise })

  const res = await payload.find({
    collection: 'products',
    where: { _status: { equals: 'published' } },
    limit: PER_PAGE,
    page,
    depth: 1,
    overrideAccess: false,
    sort: '-createdAt',
    locale,
  })

  return (
    <section className="shell" style={{ padding: '64px 0' }}>
      <header className="store-head">
        <span className="eyebrow">
          <i>{t(locale, 'apps.store.eyebrow')}</i>
        </span>
        <h1 className="section-title">{t(locale, 'apps.store.title')}</h1>
        <p
          style={{
            margin: '10px 0 0',
            fontSize: '15px',
            color: 'var(--text-mut)',
            maxWidth: '52ch',
          }}
        >
          {t(locale, 'apps.store.lead')}
        </p>
      </header>

      {res.docs.length === 0 ? (
        <p className="store-empty">{t(locale, 'apps.store.empty')}</p>
      ) : (
        <div className="store-grid">
          {res.docs.map((product) => {
            const cover =
              product.coverImage && typeof product.coverImage === 'object'
                ? (product.coverImage as Media)
                : null
            const coverUrl = cover ? getMediaUrl(cover.url) : null

            const lead = product.accessMode === 'lead-magnet'
            const tier = cheapestTier(product)
            const priceLabel = lead
              ? t(locale, 'leadMagnet.freeBadge')
              : tier
                ? `${t(locale, 'apps.store.from')} ${formatPrice(tier.priceCents, tier.currency ?? product.currency)}`
                : formatPrice(product.priceCents, product.currency)
            const tagline = firstLineFromLexical(product.description)
            const hue = hueFromString(product.slug ?? String(product.id))

            return (
              <Link
                key={product.id}
                className="product-card"
                href={getLocalizedPath(`/${product.slug}`, locale)}
              >
                <div
                  className={`product-card__cover${coverUrl ? '' : ' product-card__cover--placeholder'}`}
                  style={
                    coverUrl
                      ? { backgroundImage: `url(${coverUrl})` }
                      : ({ '--ph-hue': hue } as CSSProperties)
                  }
                >
                  {!coverUrl ? (
                    <span className="product-card__mono" aria-hidden>
                      {monogram(product.title)}
                    </span>
                  ) : null}
                  {lead ? <span className="product-card__badge">{t(locale, 'leadMagnet.freeBadge')}</span> : null}
                </div>
                <div className="product-card__body">
                  <h3 className="product-card__title">{product.title}</h3>
                  {tagline ? <p className="product-card__tagline">{tagline}</p> : null}
                  <div className="product-card__foot">
                    <span className="product-card__price mono">{priceLabel}</span>
                    <span className="product-card__cta" aria-hidden>
                      {t(locale, 'apps.store.view')} →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <Pagination page={res.page ?? page} totalPages={res.totalPages ?? 1} locale={locale} />
    </section>
  )
}
