import Link from 'next/link'
import type { Program } from '@/payload-types'
import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'
import { formatPrice } from '@/utilities/formatPrice'
import { CourseCheckoutButton } from './CourseCheckoutButton'

/** Formats a minute count as „{min} min" (<60) or „~{h} h" (rounded hours). */
function fmtHours(min: number): string {
  if (min < 60) return `${min} min`
  return `~${Math.round(min / 60)} h`
}

type Meta = {
  phases: number
  stages: number
  hardGates: number
  timeMin: number
  timeMax: number
}

type Phase = NonNullable<Program['phases']>[number]

/**
 * Syllabus hero — variant A „spine" only (handoff Sylabus.html `.hero-a`).
 * Editorial split: eyebrow + headline + lead + meta chips + CTAs on the left,
 * a `.spine-card` aside listing the course phases on the right. The A/B
 * switcher and variant B from the handoff are intentionally dropped.
 */
export function SyllabusHero({
  program,
  meta,
  phases,
  stageCounts,
  firstLessonSlug,
  enrolled,
  locale,
}: {
  program: Program
  meta: Meta
  phases: Phase[]
  /** phaseId → number of lessons (etapy) in that phase */
  stageCounts: Map<string, number>
  firstLessonSlug: string | null
  enrolled: boolean
  locale: Locale
}) {
  const headline = program.heroHeadline || program.title
  const startHref = getLocalizedPath(
    firstLessonSlug ? `/${program.slug}/learn/${firstLessonSlug}` : `/${program.slug}`,
    locale,
  )
  // Paid + not enrolled + purchasable → show the consent checkout CTA.
  const paidLocked =
    program.pricing === 'paid' &&
    !enrolled &&
    (!!program.stripePriceId || typeof program.priceCents === 'number')
  const time = `${fmtHours(meta.timeMin)}–${fmtHours(meta.timeMax)}`

  const chips: Array<{ value: string; label: string; gate?: boolean }> = [
    { value: `${meta.phases}`, label: t(locale, 'courses.syllabus.metaPhases') },
    { value: `${meta.stages}`, label: t(locale, 'courses.syllabus.metaStages') },
    { value: time, label: t(locale, 'courses.syllabus.metaTime') },
    { value: `${meta.hardGates}`, label: t(locale, 'courses.syllabus.metaGates'), gate: true },
  ]

  return (
    <header className="hero" id="hero" data-variant="a">
      <div className="shell">
        <div className="hero-a">
          <div>
            <span className="eyebrow">{t(locale, 'courses.syllabus.eyebrow')}</span>
            <h1>{headline}</h1>
            {program.heroDescription ? <p className="lead">{program.heroDescription}</p> : null}

            <div className="meta">
              {chips.map((c) => (
                <span className={c.gate ? 'm gateflag' : 'm'} key={c.label}>
                  <b>{c.value}</b>
                  <span>{c.label}</span>
                </span>
              ))}
            </div>

            <div className="cta">
              {program.pricing === 'paid' && typeof program.priceCents === 'number' ? (
                <span className="hero__price">
                  {formatPrice(program.priceCents, program.currency ?? 'pln')}
                </span>
              ) : null}
              {paidLocked ? (
                <CourseCheckoutButton
                  slug={program.slug}
                  locale={locale}
                  label={t(locale, 'courses.syllabus.buy')}
                  consentLabel={t(locale, 'courses.checkout.consent')}
                  processingLabel={t(locale, 'courses.checkout.processing')}
                  errorLabel={t(locale, 'courses.checkout.error')}
                />
              ) : (
                <Link className="btn btn--primary btn--lg" href={startHref}>
                  <span className="icon" data-i="play" aria-hidden="true" />
                  <span>
                    {enrolled
                      ? t(locale, 'courses.syllabus.continue')
                      : program.ctaLabel || t(locale, 'courses.syllabus.cta')}
                  </span>
                </Link>
              )}
            </div>
          </div>

          <aside className="spine-card" aria-label={t(locale, 'courses.syllabus.spineLabel')}>
            <div className="sc-h">
              {meta.phases} {t(locale, 'courses.syllabus.metaPhases')} ·{' '}
              {t(locale, 'courses.syllabus.spineAxis')} {phases.map((p) => p.letter).join(' → ')}
            </div>
            <div className="spine">
              {phases.map((p) => {
                const count = stageCounts.get(p.letter) ?? 0
                return (
                  <div className="row" key={p.letter}>
                    <div className="dot">{p.letter}</div>
                    <div className="nm">{p.name}</div>
                    <div className="ct">
                      {count} {t(locale, 'courses.syllabus.stageShort')}
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>
        </div>
      </div>
    </header>
  )
}
