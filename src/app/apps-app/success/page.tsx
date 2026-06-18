import type { Metadata } from 'next'
import Link from 'next/link'

import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { t } from '@/i18n'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return { title: t(locale, 'apps.success.meta') }
}

export default async function SuccessPage() {
  const locale = await getLocale()

  return (
    <section className="shell" style={{ padding: 'clamp(64px, 10vw, 120px) 0', textAlign: 'center' }}>
      <span className="eyebrow">
        <i>{t(locale, 'apps.success.eyebrow')}</i>
      </span>
      <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 720, marginTop: '16px', letterSpacing: '-0.03em' }}>
        {t(locale, 'apps.success.title')}
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
        {t(locale, 'apps.success.body')}
      </p>
      <div style={{ marginTop: '32px' }}>
        <Link className="btn btn--primary btn--lg" href={getLocalizedPath('/', locale)}>
          {t(locale, 'apps.footer.back')}
        </Link>
      </div>
    </section>
  )
}
