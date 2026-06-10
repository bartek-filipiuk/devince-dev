import Link from 'next/link'
import type { Program } from '@/payload-types'

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
}: {
  program: Program
  meta: Meta
  phases: Phase[]
  /** phaseId → number of lessons (etapy) in that phase */
  stageCounts: Map<string, number>
  firstLessonSlug: string | null
}) {
  const headline = program.heroHeadline || program.title
  const startHref = firstLessonSlug ? `/${program.slug}/learn/${firstLessonSlug}` : `/${program.slug}`
  const time = `${fmtHours(meta.timeMin)}–${fmtHours(meta.timeMax)}`

  const chips: Array<{ value: string; label: string; gate?: boolean }> = [
    { value: `${meta.phases}`, label: 'faz' },
    { value: `${meta.stages}`, label: 'etapy' },
    { value: time, label: 'szac. czas' },
    { value: `${meta.hardGates}`, label: 'hard-gate', gate: true },
  ]

  return (
    <header className="hero" id="hero" data-variant="a">
      <div className="shell">
        <div className="hero-a">
          <div>
            <span className="eyebrow">Kurs · flow produkcyjny</span>
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
              <Link className="btn btn--primary btn--lg" href={startHref}>
                <span className="icon" data-i="play" aria-hidden="true" />
                <span>{program.ctaLabel || 'Zacznij'}</span>
              </Link>
            </div>
          </div>

          <aside className="spine-card" aria-label="Przegląd faz">
            <div className="sc-h">
              {meta.phases} faz · oś{' '}
              {phases.map((p) => p.id).join(' → ')}
            </div>
            <div className="spine">
              {phases.map((p) => {
                const count = stageCounts.get(p.id) ?? 0
                return (
                  <div className="row" key={p.id}>
                    <div className="dot">{p.id}</div>
                    <div className="nm">{p.name}</div>
                    <div className="ct">{count} et.</div>
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
