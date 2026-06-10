import Link from 'next/link'
import type { Lesson, Program } from '@/payload-types'

type Phase = NonNullable<Program['phases']>[number]

/**
 * „Program" — one `.phase-block` per `program.phases`, each with a head
 * (phase letter chip, „Faza {id} · {name}", hint, etapy count) and the
 * lessons whose `phaseId` matches, sorted by `nr`. Each lesson is a `.srow`
 * link to its learn URL with hard-gate / hybrid / decision badges and a time
 * range. Faithful to the handoff `#curriculum` / `.phase-block` / `.srow`.
 */
export function Curriculum({
  slug,
  phases,
  lessons,
}: {
  slug: string
  phases: Phase[]
  lessons: Lesson[]
}) {
  return (
    <section className="block" id="curriculum-sec">
      <div className="block__head">
        <span className="eyebrow">
          <i>02</i>Program
        </span>
        <h2 className="section-title">
          {phases.length} faz · {lessons.length} etapy
        </h2>
        <p>
          Każdy etap to osobna lekcja: po co istnieje, co robisz, Definition of Done, skille i
          zależności. Twarde bramki oznaczone są jako{' '}
          <span className="badge gate" style={{ verticalAlign: 'middle' }}>
            hard-gate
          </span>{' '}
          — są nieskippowalne.
        </p>
      </div>

      <div id="curriculum">
        {phases.map((phase) => {
          const rows = lessons
            .filter((l) => l.phaseId === phase.id)
            .sort((a, b) => (a.nr ?? 0) - (b.nr ?? 0))

          return (
            <div className="phase-block" key={phase.id}>
              <div className="phase-block__head">
                <div className="pl">{phase.id}</div>
                <div className="pm">
                  <h3>
                    Faza {phase.id} · {phase.name}
                  </h3>
                  {phase.hint ? <p>{phase.hint}</p> : null}
                </div>
                <div className="pc">
                  <b>{rows.length}</b> {rows.length === 1 ? 'etap' : 'etapy'}
                </div>
              </div>

              {rows.map((lesson) => (
                <Link
                  className="srow"
                  href={`/${slug}/learn/${lesson.slug}`}
                  key={lesson.id}
                >
                  <span className="srow__nr">{String(lesson.nr ?? 0).padStart(2, '0')}</span>
                  <span className="srow__main">
                    <span className="srow__name">
                      {lesson.title}
                      {lesson.hardGate ? (
                        <span className="lk">
                          <span className="icon" data-i="lock" aria-hidden="true" />
                        </span>
                      ) : null}
                    </span>
                    <span className="srow__badges">
                      {lesson.hardGate ? <span className="badge gate">hard-gate</span> : null}
                      {lesson.hybrid ? <span className="badge hybrid">hybrid · IRL</span> : null}
                      {lesson.kind === 'decision' ? (
                        <span className="badge decision">decision</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="srow__time">
                    {lesson.estTimeMin?.min ?? 0}–{lesson.estTimeMin?.max ?? 0} min
                  </span>
                  <span className="srow__go icon" data-i="arrow" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}
