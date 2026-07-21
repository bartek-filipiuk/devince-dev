import Link from 'next/link'
import type { Program } from '@/payload-types'
import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'
import { formatPrice } from '@/utilities/formatPrice'
import { CourseCheckoutButton } from './CourseCheckoutButton'
import { CourseLeadMagnet } from './CourseLeadMagnet'
import { checkoutConsentKey } from '../_lib/consentKey'

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
  featured,
  status,
  pct,
  locale,
}: {
  program: Program
  meta: CardMeta
  enrolled: boolean
  featured?: boolean
  status?: 'new' | 'in-progress' | 'completed'
  pct?: number
  locale: Locale
}) {
  const syllabusHref = getLocalizedPath(`/${program.slug}`, locale)
  // Lead magnet (free-for-email): not enrolled → show the email capture form
  // instead of any paid control. Takes precedence over the paid path.
  const leadMagnet = program.accessMode === 'lead-magnet' && !enrolled
  // Paid + not enrolled + purchasable → consent checkout button,
  // a sibling of the title link (cannot be nested inside a <Link>).
  const paidLocked =
    !leadMagnet &&
    program.pricing === 'paid' &&
    !enrolled &&
    (!!program.stripePriceId || typeof program.priceCents === 'number')

  return (
    <div className="course-card">
      {featured ? <span className="course-card__featured">{t(locale, 'courses.store.featured')}</span> : null}
      {status === 'in-progress' ? (
        <div className="course-card__status">
          <div className="progressbar">
            <div className="progressbar__track"><div className="progressbar__fill" style={{ width: `${pct ?? 0}%` }} /></div>
          </div>
          <span>{t(locale, 'courses.store.statusInProgress')} · {pct ?? 0}%</span>
        </div>
      ) : status === 'completed' ? (
        <span className="course-card__status done">✓ {t(locale, 'courses.store.statusCompleted')}</span>
      ) : null}
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
        {/* A lead-magnet course is free — never show the paid badge/price. */}
        {program.accessMode !== 'lead-magnet' ? (
          <span className="course-card__paid">{t(locale, 'courses.store.paid')}</span>
        ) : null}
        {program.accessMode !== 'lead-magnet' &&
        program.pricing === 'paid' &&
        typeof program.priceCents === 'number' ? (
          <span className="course-card__price">
            {formatPrice(program.priceCents, program.currency ?? 'pln')}
          </span>
        ) : null}
      </div>
      <div className="course-card__foot">
        {leadMagnet ? (
          <CourseLeadMagnet slug={program.slug} locale={locale} />
        ) : paidLocked ? (
          <CourseCheckoutButton
            slug={program.slug}
            locale={locale}
            label={t(locale, 'courses.syllabus.buy')}
            consentLabel={t(locale, checkoutConsentKey(program))}
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
