import Link from 'next/link'
import type { Program } from '@/payload-types'
import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'
import { CourseCheckoutButton } from './CourseCheckoutButton'
import { CourseLeadMagnet } from './CourseLeadMagnet'

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
  // Lead magnet (free-for-email): not enrolled → email capture form (takes
  // precedence over the paid path).
  const leadMagnet = program.accessMode === 'lead-magnet' && !enrolled
  // Paid + not enrolled + purchasable → show the consent checkout CTA.
  const paidLocked =
    !leadMagnet &&
    program.pricing === 'paid' &&
    !enrolled &&
    (!!program.stripePriceId || typeof program.priceCents === 'number')

  return (
    <div className="cta-band">
      <h2>{t(locale, 'courses.syllabus.ctaBandTitle')}</h2>
      <p>{t(locale, 'courses.syllabus.ctaBandBody')}</p>
      <div className="cta">
        {leadMagnet ? (
          <CourseLeadMagnet slug={program.slug} locale={locale} />
        ) : paidLocked ? (
          <CourseCheckoutButton
            slug={program.slug}
            locale={locale}
            label={t(locale, 'courses.syllabus.buy')}
            consentLabel={t(locale, 'courses.checkout.consent')}
            processingLabel={t(locale, 'courses.checkout.processing')}
            errorLabel={t(locale, 'courses.checkout.error')}
            consentRequiredLabel={t(locale, 'courses.checkout.consentRequired')}
            newsletterLabel={t(locale, 'courses.checkout.newsletter')}
          />
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
