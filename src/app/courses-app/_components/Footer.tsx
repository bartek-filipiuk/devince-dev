import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'

/**
 * Footer for the isolated courses subdomain. Mirrors the handoff
 * Sylabus.html footer (.foot > .shell with two spans).
 *
 * The legal pages are served only on the main host, so they are linked with
 * absolute https://devince.dev URLs.
 */
export function CoursesFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="foot">
      <div className="shell">
        <span>{t(locale, 'courses.footer.tagline')}</span>
        <span className="legal-links">
          <a href={`https://devince.dev${getLocalizedPath('/regulamin', locale)}`}>
            {t(locale, 'legal.terms')}
          </a>
          <a href={`https://devince.dev${getLocalizedPath('/polityka-prywatnosci', locale)}`}>
            {t(locale, 'legal.privacy')}
          </a>
        </span>
        <span className="mono">{t(locale, 'courses.footer.stats')}</span>
      </div>
    </footer>
  )
}
