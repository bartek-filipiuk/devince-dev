import Link from 'next/link'
import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitch } from './LanguageSwitch'

/**
 * Top navigation for the isolated courses subdomain. Mirrors the handoff
 * Sylabus.html nav markup (.nav / .brand / four-dot .mark / .nav__links /
 * .nav__spacer / .nav__actions) using the course theme classes.
 */
export function CoursesNav({ locale }: { locale: Locale }) {
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
          {t(locale, 'courses.nav.brand')} <span>{t(locale, 'courses.nav.suffix')}</span>
        </b>
      </Link>
      <div className="nav__links">
        <Link href={getLocalizedPath('/', locale)}>{t(locale, 'courses.nav.courses')}</Link>
        <Link href={getLocalizedPath('/roadmap', locale)}>{t(locale, 'courses.nav.roadmap')}</Link>
        <Link href={getLocalizedPath('/account', locale)}>{t(locale, 'courses.nav.account')}</Link>
      </div>
      <div className="nav__spacer" />
      <div className="nav__actions">
        <LanguageSwitch locale={locale} />
        <ThemeToggle locale={locale} />
        <Link className="btn btn--primary" href={getLocalizedPath('/', locale)}>
          <span>{t(locale, 'courses.nav.start')}</span>
          <span className="icon" data-i="arrow" aria-hidden="true" />
        </Link>
      </div>
    </nav>
  )
}
