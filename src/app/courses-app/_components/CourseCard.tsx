import Link from 'next/link'
import type { Program } from '@/payload-types'

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
export function CourseCard({ program, meta }: { program: Program; meta: CardMeta }) {
  const time = formatTime(meta.timeMin, meta.timeMax)

  return (
    <Link className="course-card" href={`/${program.slug}`}>
      <span className="eyebrow">
        <i>Kurs</i>
      </span>
      <h3 className="course-card__title">{program.title}</h3>
      {program.heroDescription ? (
        <p className="course-card__desc">{program.heroDescription}</p>
      ) : null}
      <div className="course-card__meta mono">
        <span>{meta.phases} faz</span>
        <span>{meta.stages} etapów</span>
        {time ? <span>{time}</span> : null}
        <span className="course-card__paid">Płatny</span>
      </div>
    </Link>
  )
}

/** Renders the summed est-time range as „Xh" / „X–Yh" (minutes → hours, 1 dp). */
function formatTime(min: number, max: number): string | null {
  if (!min && !max) return null
  const toH = (m: number) => {
    const h = m / 60
    return Number.isInteger(h) ? String(h) : h.toFixed(1)
  }
  if (min === max) return `~${toH(min)}h`
  return `${toH(min)}–${toH(max)}h`
}
