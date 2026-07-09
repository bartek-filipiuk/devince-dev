import React from 'react'
import Link from 'next/link'

import type { BuildLogHeroBlock as BuildLogHeroProps } from '@/payload-types'
import { defaultLocale, type Locale } from '@/i18n'

import { CMSLink } from '@/components/Link'
import RichText from '@/components/RichText'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { getLocalizedPath } from '@/utilities/getLocale'
import {
  getBuildLogEntries,
  getCurrentlyBuilding,
  getPlatformStats,
  type BuildLogPayload,
} from '@/utilities/buildLog'

/**
 * BuildLogHero Block - Server Component
 *
 * Hero "Build Log": asymetryczny headline + panel tail -f z ostatnimi
 * wpisami (Posts/Projects/Roadmap) + pasek statusu platformy.
 * Struktura tutaj, wygląd w theme.css (sekcja 24):
 * - .blh-section / .blh-inner / .blh-eyebrow / .blh-headline / .blh-lede / .blh-ctas
 * - .blh-log / .blh-log-bar / .blh-log-body / .blh-log-row / .blh-log-date / .blh-log-msg
 * - .blh-stats / .blh-stat / .blh-stat-label / .blh-stat-value
 */
export const BuildLogHeroBlock: React.FC<BuildLogHeroProps & { locale?: Locale }> = async ({
  eyebrow,
  headline,
  lede,
  primaryCTA,
  secondaryCTA,
  showLog,
  showStats,
  customStatLabel,
  customStatValue,
  locale = defaultLocale,
}) => {
  // ponytail: Payload's `find`/`findGlobal` types collection slugs as a literal
  // union; buildLog.ts's DI-friendly BuildLogPayload types them as `string` (so
  // it stays testable without a real Payload instance). Structural cast bridges
  // the two — same pattern already used at src/app/(frontend)/api/stripe/webhook/route.ts.
  const payload = (await getPayload({ config: configPromise })) as unknown as BuildLogPayload

  const [entries, stats, building] = await Promise.all([
    showLog ? getBuildLogEntries(payload, locale, 4) : Promise.resolve([]),
    showStats ? getPlatformStats(payload, locale) : Promise.resolve(null),
    showLog ? getCurrentlyBuilding(payload, locale) : Promise.resolve(null),
  ])

  const t =
    locale === 'pl'
      ? {
          projects: 'Projekty live',
          courses: 'Kursy w sprzedaży',
          lastShip: 'Ostatnia publikacja',
          building: 'w budowie',
        }
      : {
          projects: 'Projects live',
          courses: 'Courses for sale',
          lastShip: 'Last shipped',
          building: 'building',
        }

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-US', {
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso))

  return (
    <section className="blh-section hero-section">
      <div className="hero-background" aria-hidden="true" />
      <div className="container">
        <div className="blh-inner">
          <div className="blh-main">
            {eyebrow && <p className="blh-eyebrow">{eyebrow}</p>}
            <h1 className="blh-headline hero-headline">{headline}</h1>
            {lede && (
              <div className="blh-lede">
                <RichText data={lede} enableGutter={false} />
              </div>
            )}
            <div className="blh-ctas">
              {primaryCTA?.label && (
                <CMSLink {...primaryCTA} locale={locale} className="hero-cta-primary" />
              )}
              {secondaryCTA?.label && (
                <CMSLink {...secondaryCTA} locale={locale} className="hero-cta-secondary" />
              )}
            </div>
          </div>

          {showLog && (
            <aside className="blh-log" aria-label="Build log">
              <div className="blh-log-bar">
                <span>~/build-log</span>
                <span>tail -f</span>
              </div>
              <div className="blh-log-body">
                {building && (
                  <div className="blh-log-row">
                    <span className="blh-log-date blh-log-live">●</span>
                    <span className="blh-log-msg">
                      <b>{building}</b> <span className="blh-log-live">{t.building}…</span>
                    </span>
                  </div>
                )}
                {entries.map((entry) => (
                  <Link
                    key={entry.href}
                    href={getLocalizedPath(entry.href, locale)}
                    className="blh-log-row"
                  >
                    <span className="blh-log-date">{fmtDate(entry.date)}</span>
                    <span className="blh-log-msg">
                      <b>{entry.title}</b>
                    </span>
                  </Link>
                ))}
              </div>
            </aside>
          )}
        </div>

        {showStats && (stats || (customStatLabel && customStatValue)) && (
          <div className="blh-stats" role="list">
            {stats && (
              <>
                <div className="blh-stat" role="listitem">
                  <div className="blh-stat-label">{t.projects}</div>
                  <div className="blh-stat-value">{stats.projectsLive}</div>
                </div>
                <div className="blh-stat" role="listitem">
                  <div className="blh-stat-label">{t.courses}</div>
                  <div className="blh-stat-value">{stats.programsLive}</div>
                </div>
                {stats.lastShippedAt && (
                  <div className="blh-stat" role="listitem">
                    <div className="blh-stat-label">{t.lastShip}</div>
                    <div className="blh-stat-value">{fmtDate(stats.lastShippedAt)}</div>
                  </div>
                )}
              </>
            )}
            {customStatLabel && customStatValue && (
              <div className="blh-stat" role="listitem">
                <div className="blh-stat-label">{customStatLabel}</div>
                <div className="blh-stat-value">{customStatValue}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
