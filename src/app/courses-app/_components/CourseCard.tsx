import Link from 'next/link'
import type { Program } from '@/payload-types'
import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'
import { formatPrice } from '@/utilities/formatPrice'
import { CourseCheckoutButton } from './CourseCheckoutButton'

type CardMeta = {
  phases: number
  stages: number
  hardGates: number
  timeMin: number
  timeMax: number
}

/**
 * Pure presenter for a single paid course in the storefront grid. Styled like
 * the handoff `.oc` card: eyebrow „Kurs", title, short description and a mono
 * meta row. All counts come precomputed via courseMeta in the page.
 */
export function CourseCard({
  program,
  meta,
  enrolled,
  locale,
}: {
  program: Program
  meta: CardMeta
  enrolled: boolean
  locale: Locale
}) {
  const syllabusHref = getLocalizedPath(`/${program.slug}`, locale)
  // Paid + not enrolled + purchasable → consent checkout button,
  // a sibling of the title link (cannot be nested inside a <Link>).
  const paidLocked =
    program.pricing === 'paid' &&
    !enrolled &&
    (!!program.stripePriceId || typeof program.priceCents === 'number')

  return (
    <div className="course-card">
      <Link className="course-card__head" href={syllabusHref}>
        <span className="eyebrow">
          <i>{t(locale, 'courses.auth.courseEyebrow')}</i>
        </span>
        <h3 className="course-card__title">{program.title}</h3>
        {program.heroDescription ? (
          <p className="course-card__desc">{program.heroDescription}</p>
        ) : null}
      </Link>
      <div className="course-card__meta mono">
        <span>
          {meta.phases} {t(locale, 'courses.store.phases')}
        </span>
        <span>
          {meta.stages} {t(locale, 'courses.store.stages')}
        </span>
        <span className="course-card__paid">{t(locale, 'courses.store.paid')}</span>
        {program.pricing === 'paid' && typeof program.priceCents === 'number' ? (
          <span className="course-card__price">
            {formatPrice(program.priceCents, program.currency ?? 'pln')}
          </span>
        ) : null}
      </div>
      <div className="course-card__foot">
        {paidLocked ? (
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
          <Link className="btn" href={syllabusHref}>
            {enrolled
              ? t(locale, 'courses.syllabus.continue')
              : t(locale, 'courses.store.details')}
          </Link>
        )}
      </div>
    </div>
  )
}
