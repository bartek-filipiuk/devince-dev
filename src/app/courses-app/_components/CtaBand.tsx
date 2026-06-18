import Link from 'next/link'
import type { Program } from '@/payload-types'
import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'

/**
 * Closing `.cta-band` (handoff) driving the learner into the course: course
 * CTA label → first lesson's learn URL. The decorative „+" corners come from
 * the `.cta-band::before/::after` CSS.
 */
export function CtaBand({
  program,
  firstLessonSlug,
  enrolled,
  locale,
}: {
  program: Program
  firstLessonSlug: string | null
  enrolled: boolean
  locale: Locale
}) {
  const href = getLocalizedPath(
    firstLessonSlug ? `/${program.slug}/learn/${firstLessonSlug}` : `/${program.slug}`,
    locale,
  )
  // Paid + not enrolled + has a Stripe link → show the external buy CTA.
  const paidLocked = program.pricing === 'paid' && !enrolled && !!program.stripePaymentLink

  return (
    <div className="cta-band">
      <h2>{t(locale, 'courses.syllabus.ctaBandTitle')}</h2>
      <p>{t(locale, 'courses.syllabus.ctaBandBody')}</p>
      <div className="cta">
        {paidLocked ? (
          <a
            className="btn btn--primary btn--lg"
            href={program.stripePaymentLink!}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t(locale, 'courses.syllabus.buy')}
          </a>
        ) : (
          <Link className="btn btn--primary btn--lg" href={href}>
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
  )
}
