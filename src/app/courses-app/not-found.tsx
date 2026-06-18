import Link from 'next/link'

import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { t } from '@/i18n'

/**
 * Course-themed 404 for the isolated courses subdomain. Uses the available
 * `courses.notFound.*` dictionary keys and links back to the storefront.
 */
export default async function NotFound() {
  const locale = await getLocale()

  return (
    <section className="shell" style={{ padding: 'clamp(64px, 10vw, 120px) 0' }}>
      <div
        style={{
          maxWidth: '520px',
          background: 'var(--surface-1)',
          border: '1px solid var(--line-soft)',
          borderRadius: 'var(--r-card)',
          padding: 'clamp(24px, 4vw, 40px)',
        }}
      >
        <span className="eyebrow">
          <i>{t(locale, 'courses.auth.eyebrow')}</i>
        </span>
        <h1
          className="section-title"
          style={{ marginTop: '16px', marginBottom: '24px' }}
        >
          {t(locale, 'courses.notFound.title')}
        </h1>
        <Link className="btn btn--primary" href={getLocalizedPath('/', locale)}>
          <span>{t(locale, 'courses.notFound.cta')}</span>
          <span className="icon" data-i="arrow" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
