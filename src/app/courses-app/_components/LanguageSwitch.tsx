import Link from 'next/link'
import { headers } from 'next/headers'
import { locales, type Locale } from '@/i18n'
import { getLocalizedPath, removeLocaleFromPath } from '@/utilities/getLocale'

/**
 * Locale switcher for the isolated courses subdomain. Reads the current bare
 * path from the `x-pathname` header (set by middleware) and renders one link
 * per locale via getLocalizedPath, so EN keeps the `/en` prefix and PL stays
 * bare.
 */
export async function LanguageSwitch({ locale }: { locale: Locale }) {
  const pathname = (await headers()).get('x-pathname') || '/'
  const bare = removeLocaleFromPath(pathname)

  return (
    <div className="lang-switch">
      {locales.map((l) => (
        <Link
          key={l}
          href={getLocalizedPath(bare, l)}
          aria-current={l === locale ? 'true' : undefined}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  )
}
