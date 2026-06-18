import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'

/**
 * Footer for the isolated apps subdomain. Mirrors the Sylabus-derived
 * footer (.foot > .shell) from courses-app.
 *
 * The legal pages are served only on the main host, so they are linked with
 * absolute https://devince.dev URLs.
 */
export function AppsFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="foot">
      <div className="shell">
        <span>
          <a href="https://devince.dev">devince.dev</a>
          {' '}— {t(locale, 'apps.footer.tagline')}
        </span>
        <span className="legal-links">
          <a href={`https://devince.dev${getLocalizedPath('/regulamin', locale)}`}>
            {t(locale, 'legal.terms')}
          </a>
          <a href={`https://devince.dev${getLocalizedPath('/polityka-prywatnosci', locale)}`}>
            {t(locale, 'legal.privacy')}
          </a>
        </span>
        <span className="mono">© {new Date().getFullYear()} Devince</span>
      </div>
    </footer>
  )
}
