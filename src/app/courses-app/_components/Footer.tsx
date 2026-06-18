import { t, type Locale } from '@/i18n'

/**
 * Footer for the isolated courses subdomain. Mirrors the handoff
 * Sylabus.html footer (.foot > .shell with two spans).
 */
export function CoursesFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="foot">
      <div className="shell">
        <span>{t(locale, 'courses.footer.tagline')}</span>
        <span className="mono">9 faz · 23 etapy · 4 hard-gate</span>
      </div>
    </footer>
  )
}
