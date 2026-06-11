import Link from 'next/link'
import type { Program } from '@/payload-types'

/**
 * Closing `.cta-band` (handoff) driving the learner into the course: course
 * CTA label → first lesson's learn URL. The decorative „+" corners come from
 * the `.cta-band::before/::after` CSS.
 */
export function CtaBand({
  program,
  firstLessonSlug,
}: {
  program: Program
  firstLessonSlug: string | null
}) {
  const href = firstLessonSlug
    ? `/${program.slug}/learn/${firstLessonSlug}`
    : `/${program.slug}`

  return (
    <div className="cta-band">
      <h2>Gotowy, żeby zacząć?</h2>
      <p>
        Przejdź cały pipeline od pomysłu do wdrożenia — krok po kroku, z twardymi bramkami, które
        pilnują jakości.
      </p>
      <div className="cta">
        <Link className="btn btn--primary btn--lg" href={href}>
          <span className="icon" data-i="play" aria-hidden="true" />
          <span>{program.ctaLabel || 'Zacznij'}</span>
        </Link>
      </div>
    </div>
  )
}
