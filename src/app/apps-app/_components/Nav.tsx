import Link from 'next/link'
import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitch } from './LanguageSwitch'

/**
 * Top navigation for the isolated apps subdomain. Mirrors the Sylabus-derived
 * nav markup (.nav / .brand / four-dot .mark / .nav__spacer / .nav__actions)
 * from courses-app. No login/account links — account-less downloadable store.
 */
export function AppsNav({ locale }: { locale: Locale }) {
  return (
    <nav className="nav">
      <Link className="brand" href={getLocalizedPath('/', locale)}>
        <span className="mark">
          <i />
          <i />
          <i />
          <i />
        </span>
        <b>
          {t(locale, 'apps.nav.brand')} <span>{t(locale, 'apps.nav.suffix')}</span>
        </b>
      </Link>
      <div className="nav__links">
        <Link href={getLocalizedPath('/roadmap', locale)}>{t(locale, 'apps.nav.roadmap')}</Link>
        <Link href={getLocalizedPath('/changelog', locale)}>{t(locale, 'apps.nav.changelog')}</Link>
      </div>
      <div className="nav__spacer" />
      <div className="nav__actions">
        <LanguageSwitch locale={locale} />
        <ThemeToggle locale={locale} />
      </div>
    </nav>
  )
}
