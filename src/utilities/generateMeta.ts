import type { Metadata } from 'next'

import type { Media, Page, Post, Program, Project, Config } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import { getServerSideURL } from './getURL'
import { defaultLocale, t, type Locale } from '@/i18n'
import { getLocalizedPath } from './getLocale'

const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null) => {
  const serverUrl = getServerSideURL()

  let url = serverUrl + '/website-template-OG.webp'

  if (image && typeof image === 'object' && 'url' in image) {
    const ogUrl = image.sizes?.og?.url

    url = ogUrl ? serverUrl + ogUrl : serverUrl + image.url
  }

  return url
}

const getSiteName = () => process.env.NEXT_PUBLIC_SITE_NAME || 'Devince'

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | Partial<Program> | Partial<Project> | null
  locale?: Locale
  path?: string
}): Promise<Metadata> => {
  const { doc, locale = defaultLocale, path } = args

  const siteName = getSiteName()

  const ogImage = getImageURL(doc?.meta?.image)

  const title = doc?.meta?.title ? doc?.meta?.title + ` | ${siteName}` : siteName

  const description = doc?.meta?.description || t(locale, 'seo.defaultDescription')

  // Build the locale-neutral path used for hreflang alternates.
  const slugPath = path ?? (Array.isArray(doc?.slug) ? doc?.slug.join('/') : '/')

  const alternates = slugPath
    ? {
        languages: {
          pl: getLocalizedPath(slugPath, 'pl'),
          en: getLocalizedPath(slugPath, 'en'),
        },
      }
    : undefined

  return {
    alternates,
    description,
    openGraph: mergeOpenGraph(
      {
        description,
        images: ogImage
          ? [
              {
                url: ogImage,
              },
            ]
          : undefined,
        title,
        url: getLocalizedPath(slugPath, locale),
      },
      locale,
    ),
    title,
  }
}
