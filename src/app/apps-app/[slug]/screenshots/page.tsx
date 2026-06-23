import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import type { Product } from '@/payload-types'
import type { Locale } from '@/i18n'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { t } from '@/i18n'
import { ProductGallery } from '../../_components/ProductGallery'
import { resolveScreenshots } from '../../_lib/resolveScreenshots'

export const dynamic = 'force-dynamic'

// depth: 2 so each screenshot row's `image` relation is populated (the array
// adds a nesting level over the document).
async function getProduct(slug: string, locale: Locale): Promise<Product | null> {
  const payload = await getPayload({ config: configPromise })
  const res = await payload.find({
    collection: 'products',
    where: {
      and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
    },
    limit: 1,
    overrideAccess: false,
    depth: 2,
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
  return { title: `${product.title} · ${t(locale, 'apps.product.gallery')}` }
}

export default async function ProductScreenshotsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const locale = await getLocale()
  const product = await getProduct(slug, locale)
  if (!product) notFound()

  const shots = resolveScreenshots(
    product.screenshots,
    product.title,
    (u) => (u ? getMediaUrl(u) : null),
  )
  // No screenshots → no gallery page (the product page won't link here either).
  if (!shots.length) notFound()

  return (
    <article className="shell" style={{ padding: '40px 0 64px' }}>
      <Link className="btn btn--ghost" href={getLocalizedPath(`/${product.slug}`, locale)}>
        ← {t(locale, 'apps.gallery.back')}
      </Link>
      <header style={{ margin: '22px 0 4px' }}>
        <span className="eyebrow">
          <i>{product.title}</i>
        </span>
      </header>
      <section className="product-gallery">
        <ProductGallery items={shots} heading={t(locale, 'apps.product.gallery')} />
      </section>
    </article>
  )
}
