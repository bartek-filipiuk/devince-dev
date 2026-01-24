import { headers } from 'next/headers'
import { defaultLocale, isValidLocale, type Locale } from '@/i18n'

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

export function getLocaleFromParams(locale?: string): Locale {
  if (locale && isValidLocale(locale)) {
    return locale as Locale
  }
  return defaultLocale
}

export function getLocalizedPath(path: string, locale: Locale): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path

  // For default locale, don't add prefix
  if (locale === defaultLocale) {
    return `/${cleanPath}`
  }

  // For other locales, add prefix
  return `/${locale}/${cleanPath}`
}

export function removeLocaleFromPath(pathname: string): string {
  const segments = pathname.split('/')
  const firstSegment = segments[1]

  if (firstSegment && isValidLocale(firstSegment)) {
    return '/' + segments.slice(2).join('/') || '/'
  }

  return pathname
}
