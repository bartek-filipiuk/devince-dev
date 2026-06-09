import { headers } from 'next/headers'
import { defaultLocale, isValidLocale, type Locale } from '@/i18n'

/**
 * Server-only locale resolver. Reads the `x-locale` header set by middleware,
 * falling back to the pathname header and finally the default locale.
 *
 * Prefer deriving locale from route `params` via `getLocaleFromParams` in pages.
 * Use this only in server components/blocks that don't receive `params`.
 */
export async function getLocale(): Promise<Locale> {
  const headersList = await headers()

  // First try to get locale from middleware header
  const localeHeader = headersList.get('x-locale')
  if (localeHeader && isValidLocale(localeHeader)) {
    return localeHeader as Locale
  }

  // Fallback: check pathname from header
  const pathname = headersList.get('x-pathname') || ''
  const segments = pathname.split('/').filter(Boolean)
  const firstSegment = segments[0]

  if (firstSegment && isValidLocale(firstSegment)) {
    return firstSegment as Locale
  }

  return defaultLocale
}
