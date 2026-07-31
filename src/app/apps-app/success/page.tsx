import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { t } from '@/i18n'
import { DownloadReady } from './DownloadReady'

// The grant is resolved per request (and may not exist yet) — never cache this.
export const dynamic = 'force-dynamic'

const SESSION_ID_RE = /^cs_[A-Za-z0-9_]{10,255}$/

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return { title: t(locale, 'apps.success.meta'), robots: { index: false, follow: false } }
}

/**
 * Resolve the grant server-side FIRST. In the common case the Stripe webhook has
 * already landed by the time the buyer is redirected here, so the download button
 * renders in the first paint — no spinner, no client round-trip. Only when the
 * webhook is still in flight do we hand over to the polling component.
 */
async function findToken(sessionId: string): Promise<string | null> {
  try {
    const payload = await getPayload({ config: configPromise })
    const found = await payload.find({
      collection: 'download-grants',
      where: { stripeSessionId: { equals: sessionId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const grant = found.docs[0] as { token?: string } | undefined
    return grant?.token ?? null
  } catch {
    // A DB hiccup must not break the thank-you page — the client poll and the
    // email both still lead to the file.
    return null
  }
}

function DownloadBlock({ token, locale }: { token: string; locale: Parameters<typeof t>[0] }) {
  return (
    <div style={{ marginTop: '28px' }}>
      <p style={{ margin: '0 0 18px', fontSize: '15px', color: 'var(--text-mut)' }}>
        {t(locale, 'apps.success.ready')}
      </p>
      <a className="btn btn--primary btn--lg" href={`/download/${encodeURIComponent(token)}`}>
        {t(locale, 'apps.success.cta')}
      </a>
      <p style={{ margin: '18px 0 0', fontSize: '14px', color: 'var(--text-mut)' }}>
        {t(locale, 'apps.success.alsoEmail')}
      </p>
    </div>
  )
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const locale = await getLocale()
  const { session_id: raw } = await searchParams
  const sessionId = typeof raw === 'string' && SESSION_ID_RE.test(raw) ? raw : null
  const token = sessionId ? await findToken(sessionId) : null

  return (
    <section className="shell" style={{ padding: 'clamp(64px, 10vw, 120px) 0', textAlign: 'center' }}>
      <span className="eyebrow">
        <i>{t(locale, 'apps.success.eyebrow')}</i>
      </span>
      <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 720, marginTop: '16px', letterSpacing: '-0.03em' }}>
        {t(locale, 'apps.success.title')}
      </h1>

      {token ? (
        <DownloadBlock token={token} locale={locale} />
      ) : sessionId ? (
        <DownloadReady
          sessionId={sessionId}
          labels={{
            preparing: t(locale, 'apps.success.preparing'),
            ready: t(locale, 'apps.success.ready'),
            cta: t(locale, 'apps.success.cta'),
            alsoEmail: t(locale, 'apps.success.alsoEmail'),
            fallback: t(locale, 'apps.success.body'),
          }}
        />
      ) : (
        // No session id (direct visit, or a link minted before success_url
        // carried it) — the email is the only channel we can honestly name.
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
      )}

      <div style={{ marginTop: '32px' }}>
        <Link className="btn" href={getLocalizedPath('/', locale)}>
          {t(locale, 'apps.footer.back')}
        </Link>
      </div>
    </section>
  )
}
