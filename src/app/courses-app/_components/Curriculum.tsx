import Link from 'next/link'
import type { Lesson, Program } from '@/payload-types'
import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'

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
  locale,
}: {
  slug: string
  phases: Phase[]
  lessons: Lesson[]
  locale: Locale
}) {
  return (
    <section className="block" id="curriculum-sec">
      <div className="block__head">
        <span className="eyebrow">
          <i>02</i>
          {t(locale, 'courses.syllabus.curriculumEyebrow')}
        </span>
        <h2 className="section-title">
          {phases.length} {t(locale, 'courses.syllabus.metaPhases')} · {lessons.length}{' '}
          {t(locale, 'courses.syllabus.metaStages')}
        </h2>
        <p>
          {t(locale, 'courses.syllabus.curriculumNote')}{' '}
          <span className="badge gate" style={{ verticalAlign: 'middle' }}>
            {t(locale, 'courses.badge.gate')}
          </span>{' '}
          {t(locale, 'courses.syllabus.curriculumNoteAfter')}
        </p>
      </div>

      <div id="curriculum">
        {phases.map((phase) => {
          const rows = lessons
            .filter((l) => l.phaseId === phase.letter)
            .sort((a, b) => (a.nr ?? 0) - (b.nr ?? 0))

          return (
            <div className="phase-block" key={phase.letter}>
              <div className="phase-block__head">
                <div className="pl">{phase.letter}</div>
                <div className="pm">
                  <h3>
                    {t(locale, 'courses.syllabus.phase')} {phase.letter} · {phase.name}
                  </h3>
                  {phase.hint ? <p>{phase.hint}</p> : null}
                </div>
                <div className="pc">
                  <b>{rows.length}</b>{' '}
                  {rows.length === 1
                    ? t(locale, 'courses.syllabus.stageSingular')
                    : t(locale, 'courses.syllabus.stagePlural')}
                </div>
              </div>

              {rows.map((lesson) => (
                <Link
                  className="srow"
                  href={getLocalizedPath(`/${slug}/learn/${lesson.slug}`, locale)}
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
                      {lesson.hardGate ? (
                        <span className="badge gate">{t(locale, 'courses.badge.gate')}</span>
                      ) : null}
                      {lesson.hybrid ? (
                        <span className="badge hybrid">{t(locale, 'courses.badge.hybrid')}</span>
                      ) : null}
                      {lesson.kind === 'decision' ? (
                        <span className="badge decision">{t(locale, 'courses.badge.decision')}</span>
                      ) : null}
                    </span>
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
