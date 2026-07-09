import React from 'react'

import type { BuildLogHeroBlock as BuildLogHeroProps } from '@/payload-types'
import { defaultLocale, type Locale } from '@/i18n'

import { CMSLink } from '@/components/Link'
import RichText from '@/components/RichText'

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
              <div className="blh-log-body">{/* Task 6: wiersze z danych */}</div>
            </aside>
          )}
        </div>

        {showStats && (
          <div className="blh-stats" role="list">
            {/* Task 6: statystyki z danych */}
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
