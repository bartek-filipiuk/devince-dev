import { headers } from 'next/headers'
import { locales, type Locale } from '@/i18n'
import { getLocalizedPath, removeLocaleFromPath } from '@/utilities/getLocale'

/**
 * Locale switcher for the isolated apps subdomain. Reads the current bare path
 * from the `x-pathname` header (set by middleware) and renders one link per
 * locale via getLocalizedPath, so EN keeps the `/en` prefix and PL stays bare.
 *
 * Uses a plain <a> (full navigation), NOT next/link: apps-app has no [locale]
 * route segment (the /en prefix is stripped by middleware and rewritten into the
 * same /apps-app tree), so a soft client navigation would NOT re-render the
 * shared layout (Nav/Footer/this switcher) — only the page body — leaving the
 * chrome stuck in the old locale. A full reload re-renders everything for the
 * new x-locale. Mirrors the main site's full-navigation language switcher.
 */
export async function LanguageSwitch({ locale }: { locale: Locale }) {
  const pathname = (await headers()).get('x-pathname') || '/'
  const bare = removeLocaleFromPath(pathname)

  return (
    <div className="lang-switch">
      {locales.map((l) => (
        <a
          key={l}
          href={getLocalizedPath(bare, l)}
          aria-current={l === locale ? 'true' : undefined}
        >
          {l.toUpperCase()}
        </a>
      ))}
    </div>
  )
}
