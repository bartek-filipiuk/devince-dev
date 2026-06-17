import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import type { Media } from '@/payload-types'
import { formatPrice } from '@/utilities/formatPrice'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { Pagination } from '../courses-app/_components/Pagination'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sklep',
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

  const payload = await getPayload({ config: configPromise })

  const res = await payload.find({
    collection: 'products',
    where: { _status: { equals: 'published' } },
    limit: PER_PAGE,
    page,
    depth: 1,
    overrideAccess: false,
    sort: '-createdAt',
  })

  return (
    <section className="shell" style={{ padding: '64px 0' }}>
      <header className="store-head">
        <span className="eyebrow">
          <i>sklep</i>
        </span>
        <h1 className="section-title">Aplikacje i pliki</h1>
        <p
          style={{
            margin: '10px 0 0',
            fontSize: '15px',
            color: 'var(--text-mut)',
            maxWidth: '52ch',
          }}
        >
          Gotowe narzędzia, szablony i pliki do pobrania — kup raz, korzystaj bez limitu.
        </p>
      </header>

      {res.docs.length === 0 ? (
        <p className="store-empty">Wkrótce — pracujemy nad pierwszymi produktami.</p>
      ) : (
        <div className="store-grid">
          {res.docs.map((product) => {
            const cover =
              product.coverImage && typeof product.coverImage === 'object'
                ? (product.coverImage as Media)
                : null
            const coverUrl = cover ? getMediaUrl(cover.url) : null

            return (
              <Link key={product.id} className="course-card" href={`/${product.slug}`}>
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={cover?.alt ?? product.title}
                    style={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      objectFit: 'cover',
                      borderRadius: 'calc(var(--r-card) - 2px)',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  />
                ) : null}
                <h3 className="course-card__title">{product.title}</h3>
                <div className="course-card__meta mono">
                  <span className="course-card__paid">
                    {formatPrice(product.priceCents, product.currency)}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <Pagination page={res.page ?? page} totalPages={res.totalPages ?? 1} />
    </section>
  )
}
