import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'
import { defaultLocale, t, type Locale } from '@/i18n'

const ogLocaleMap: Record<Locale, string> = {
  pl: 'pl_PL',
  en: 'en_US',
}

const getSiteName = () => process.env.NEXT_PUBLIC_SITE_NAME || 'Devince'

const getDefaultOpenGraph = (locale: Locale) =>
  ({
    type: 'website',
    description: t(locale, 'seo.defaultDescription'),
    images: [
      {
        url: `${getServerSideURL()}/website-template-OG.webp`,
      },
    ],
    locale: ogLocaleMap[locale],
    siteName: getSiteName(),
    title: getSiteName(),
  }) satisfies Metadata['openGraph']

export const mergeOpenGraph = (
  og?: Metadata['openGraph'],
  locale: Locale = defaultLocale,
): Metadata['openGraph'] => {
  const defaultOpenGraph = getDefaultOpenGraph(locale)
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
