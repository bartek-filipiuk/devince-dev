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
  locale,
}: {
  program: Program
  firstLessonSlug: string | null
  locale: Locale
}) {
  const href = getLocalizedPath(
    firstLessonSlug ? `/${program.slug}/learn/${firstLessonSlug}` : `/${program.slug}`,
    locale,
  )

  return (
    <div className="cta-band">
      <h2>{t(locale, 'courses.syllabus.ctaBandTitle')}</h2>
      <p>{t(locale, 'courses.syllabus.ctaBandBody')}</p>
      <div className="cta">
        <Link className="btn btn--primary btn--lg" href={href}>
          <span className="icon" data-i="play" aria-hidden="true" />
          <span>{program.ctaLabel || t(locale, 'courses.syllabus.cta')}</span>
        </Link>
      </div>
    </div>
  )
}
