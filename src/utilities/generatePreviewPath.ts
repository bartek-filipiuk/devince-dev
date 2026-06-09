import { PayloadRequest, CollectionSlug } from 'payload'
import { defaultLocale, isValidLocale, type Locale } from '@/i18n'
import { getLocalizedPath } from './getLocale'

const collectionPrefixMap: Partial<Record<CollectionSlug, string>> = {
  posts: '/posts',
  program: '/program',
  projects: '/projects',
  pages: '',
}

type Props = {
  collection: keyof typeof collectionPrefixMap
  slug: string
  req: PayloadRequest
  locale?: Locale
}

const resolveLocale = (req: PayloadRequest, locale?: Locale): Locale => {
  if (locale && isValidLocale(locale)) {
    return locale
  }

  // Payload injects the active admin locale on the request.
  const reqLocale = (req as { locale?: string })?.locale
  if (reqLocale && isValidLocale(reqLocale)) {
    return reqLocale
  }

  return defaultLocale
}

export const generatePreviewPath = ({ collection, slug, req, locale }: Props) => {
  // Allow empty strings, e.g. for the homepage
  if (slug === undefined || slug === null) {
    return null
  }

  const activeLocale = resolveLocale(req, locale)

  // Encode to support slugs with special characters
  const encodedSlug = encodeURIComponent(slug)

  // Build the locale-neutral path, then prefix the active locale.
  const basePath = `${collectionPrefixMap[collection]}/${encodedSlug}`
  const localizedPath = getLocalizedPath(basePath, activeLocale)

  const encodedParams = new URLSearchParams({
    slug: encodedSlug,
    collection,
    path: localizedPath,
    locale: activeLocale,
    previewSecret: process.env.PREVIEW_SECRET || '',
  })

  const url = `/next/preview?${encodedParams.toString()}`

  return url
}
