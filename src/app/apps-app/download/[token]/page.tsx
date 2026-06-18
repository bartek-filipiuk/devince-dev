import type { Metadata } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import type { AppAsset } from '@/payload-types'
import { resolveGrant } from '@/utilities/resolveGrant'
import { getLocale } from '@/utilities/getLocale.server'
import { t } from '@/i18n'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return {
    title: t(locale, 'apps.download.meta'),
    robots: { index: false, follow: false },
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const locale = await getLocale()
  const payload = await getPayload({ config: configPromise })

  const resolved = await resolveGrant(payload, token)

  /* ── INVALID ── */
  if (resolved.status === 'invalid') {
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
            <i>{t(locale, 'apps.download.eyebrow')}</i>
          </span>
          <h1
            style={{
              fontSize: 'clamp(22px, 3vw, 28px)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              marginTop: '16px',
              marginBottom: '12px',
            }}
          >
            {t(locale, 'apps.download.invalid')}
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-mut)', lineHeight: 1.6 }}>
            {t(locale, 'apps.download.invalidBody')}
          </p>
        </div>
      </section>
    )
  }

  /* ── EXPIRED ── */
  if (resolved.status === 'expired') {
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
            <i>{t(locale, 'apps.download.eyebrow')}</i>
          </span>
          <h1
            style={{
              fontSize: 'clamp(22px, 3vw, 28px)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              marginTop: '16px',
              marginBottom: '12px',
            }}
          >
            {t(locale, 'apps.download.expired')}
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-mut)', lineHeight: 1.6 }}>
            {t(locale, 'apps.download.expiredBody')}
          </p>
        </div>
      </section>
    )
  }

  /* ── LIMIT ── */
  if (resolved.status === 'limit') {
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
            <i>{t(locale, 'apps.download.eyebrow')}</i>
          </span>
          <h1
            style={{
              fontSize: 'clamp(22px, 3vw, 28px)',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              marginTop: '16px',
              marginBottom: '12px',
            }}
          >
            {t(locale, 'apps.download.limit')}
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-mut)', lineHeight: 1.6 }}>
            {t(locale, 'apps.download.limitBody')}
          </p>
        </div>
      </section>
    )
  }

  /* ── OK ── */
  if (resolved.status !== 'ok') return null // unreachable — all other statuses returned above

  const { grant, product } = resolved

  // Normalize downloadFiles: depth=0, so items are numbers or populated objects.
  const fileIds = (product.downloadFiles ?? []).map(
    (f: number | AppAsset): number =>
      typeof f === 'object' && f !== null ? (f as AppAsset).id : (f as number),
  )

  // Load each asset (admin-only collection — gate is the grant, not the asset ACL).
  const assets: (AppAsset | null)[] = await Promise.all(
    fileIds.map((id: number) =>
      payload
        .findByID({
          collection: 'app-assets',
          id,
          depth: 0,
          overrideAccess: true, // gate is the grant; asset collection is admin-only
        })
        .catch(() => null),
    ),
  )

  const remaining = grant.maxUses - grant.uses

  return (
    <section className="shell" style={{ padding: 'clamp(64px, 10vw, 120px) 0' }}>
      <div style={{ maxWidth: '600px' }}>
        <span className="eyebrow">
          <i>{t(locale, 'apps.download.eyebrow')}</i>
        </span>
        <h1
          style={{
            fontSize: 'clamp(22px, 3vw, 32px)',
            fontWeight: 720,
            letterSpacing: '-0.03em',
            marginTop: '16px',
            marginBottom: '6px',
          }}
        >
          {product.title}
        </h1>
        <p
          className="mono"
          style={{
            margin: '0 0 28px',
            fontSize: '13px',
            color: 'var(--text-dim)',
          }}
        >
          {t(locale, 'apps.download.remaining')}{' '}
          <span style={{ color: remaining > 0 ? 'var(--accent)' : 'var(--gate)' }}>
            {remaining}
          </span>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {assets.map((asset) => {
            if (!asset) return null
            const assetId = asset.id
            const href = `/api/apps/download/${token}?file=${assetId}`
            const name = asset.filename ?? `plik-${assetId}`
            const size =
              typeof asset.filesize === 'number' ? formatFileSize(asset.filesize) : null

            return (
              <a
                key={assetId}
                href={href}
                className="btn btn--primary btn--lg"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}
                download
              >
                <span
                  style={{
                    flex: 1,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {name}
                </span>
                {size ? (
                  <span
                    style={{
                      fontSize: '12px',
                      opacity: 0.7,
                      fontFamily: 'var(--font-mono)',
                      flexShrink: 0,
                    }}
                  >
                    {size}
                  </span>
                ) : null}
              </a>
            )
          })}
        </div>

        {fileIds.length === 0 ? (
          <p
            style={{
              marginTop: '16px',
              fontSize: '14px',
              color: 'var(--text-dim)',
              fontStyle: 'italic',
            }}
          >
            {t(locale, 'apps.download.contact')}
          </p>
        ) : null}
      </div>
    </section>
  )
}
