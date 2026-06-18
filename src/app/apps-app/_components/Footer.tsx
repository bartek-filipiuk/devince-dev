import { t, type Locale } from '@/i18n'

/**
 * Footer for the isolated apps subdomain. Mirrors the Sylabus-derived
 * footer (.foot > .shell) from courses-app.
 */
export function AppsFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="foot">
      <div className="shell">
        <span>
          <a href="https://devince.dev">devince.dev</a>
          {' '}— {t(locale, 'apps.footer.tagline')}
        </span>
        <span className="mono">© {new Date().getFullYear()} Devince</span>
      </div>
    </footer>
  )
}
