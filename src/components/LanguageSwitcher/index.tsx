'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { Globe } from 'lucide-react'
import { locales, localeLabels, defaultLocale, isValidLocale, type Locale } from '@/i18n'
import { Button } from '@/components/ui/button'

function getLocaleFromPath(pathname: string): Locale {
  const segments = pathname.split('/').filter(Boolean)
  const firstSegment = segments[0]
  if (firstSegment && isValidLocale(firstSegment)) {
    return firstSegment as Locale
  }
  return defaultLocale
}

function getLocalizedPath(pathname: string, targetLocale: Locale): string {
  // Get path segments
  const segments = pathname.split('/').filter(Boolean)

  // Check if first segment is a locale
  const firstSegment = segments[0]
  const hasLocalePrefix = firstSegment && isValidLocale(firstSegment)

  // Remove existing locale prefix if present
  const pathWithoutLocale = hasLocalePrefix ? '/' + segments.slice(1).join('/') : pathname

  // For default locale, return path without prefix
  if (targetLocale === defaultLocale) {
    return pathWithoutLocale || '/'
  }

  // For other locales, add prefix
  return `/${targetLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`
}

// Switching language uses a plain <a> (full navigation), NOT next/link.
// Header/Footer + LocaleProvider live in the shared root layout, which is NOT
// re-rendered on client-side navigation — so a soft <Link> would change the URL
// and page body but leave the chrome (menu/footer) in the old language until a
// manual reload. A full navigation re-runs the layout, so everything switches at
// once. Language switching is infrequent, so the full reload is acceptable.

export function LanguageSwitcher() {
  const pathname = usePathname()
  // Detect locale directly from URL path for accurate client-side detection
  const locale = getLocaleFromPath(pathname)

  // For a simple 2-language site, just show a toggle to the other language
  const otherLocale: Locale = locale === 'pl' ? 'en' : 'pl'
  const otherPath = getLocalizedPath(pathname, otherLocale)

  return (
    <Button variant="ghost" size="sm" asChild className="hover:bg-transparent hover:text-primary">
      <a
        href={otherPath}
        className="flex items-center gap-1.5"
        aria-label={`Switch language to ${localeLabels[otherLocale]}`}
      >
        <Globe className="h-4 w-4" />
        <span className="uppercase text-xs font-medium">{otherLocale}</span>
      </a>
    </Button>
  )
}

export function LanguageSwitcherFull() {
  const pathname = usePathname()
  const locale = getLocaleFromPath(pathname)

  return (
    <div className="flex items-center gap-1">
      {locales.map((loc) => (
        <Button key={loc} variant={loc === locale ? 'secondary' : 'ghost'} size="sm" asChild>
          <a href={getLocalizedPath(pathname, loc)} aria-label={localeLabels[loc]}>
            <span className="uppercase text-xs">{loc}</span>
          </a>
        </Button>
      ))}
    </div>
  )
}
