import type { Metadata } from 'next'
import Link from 'next/link'

import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { t } from '@/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return { title: t(locale, 'courses.success.meta') }
}

/**
 * Courses "check your email" page — the Stripe success_url target after a paid
 * course checkout. Purely a confirmation: the webhook does the actual grant +
 * sets the password-setup email in flight, so there's no data fetch here.
 */
export default async function CoursesSuccessPage() {
  const locale = await getLocale()

  return (
    <section className="shell" style={{ padding: 'clamp(64px, 10vw, 120px) 0', textAlign: 'center' }}>
      <span className="eyebrow">
        <i>{t(locale, 'courses.success.eyebrow')}</i>
      </span>
      <h1
        className="section-title"
        style={{ marginTop: '16px', maxWidth: '20ch', marginInline: 'auto' }}
      >
        {t(locale, 'courses.success.title')}
      </h1>
      <p
        style={{
          marginTop: '18px',
          fontSize: 'clamp(15px, 1.6vw, 18px)',
          color: 'var(--text-mut)',
          lineHeight: 1.55,
          maxWidth: '48ch',
          marginInline: 'auto',
        }}
      >
        {t(locale, 'courses.success.body')}
      </p>
      <div style={{ marginTop: '32px' }}>
        <Link className="btn btn--primary btn--lg" href={getLocalizedPath('/', locale)}>
          {t(locale, 'courses.success.back')}
        </Link>
      </div>
    </section>
  )
}
