import { defaultLocale, isValidLocale, type Locale } from '@/i18n'

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
