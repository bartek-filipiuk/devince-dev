import Link from 'next/link'
import type { Lesson, Program } from '@/payload-types'
import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'
import { phaseProgress, progressFor } from '@/utilities/courseProgress'

type Phase = NonNullable<Program['phases']>[number]
const pad = (n: number | null | undefined) => String(n ?? 0).padStart(2, '0')

export function LessonSidebar({ slug, program, lesson, sorted, completedIds, locale, maxUnlockedNr }: {
  slug: string
  program: Program
  lesson: Lesson
  sorted: Lesson[]
  completedIds: Set<number>
  locale: Locale
  maxUnlockedNr?: number | null
}) {
  const phases: Phase[] = program.phases ?? []
  const byPhase = phaseProgress(sorted, completedIds)
  const overall = progressFor(sorted.length, completedIds.size)

  return (
    <aside className="side">
      <details className="navwrap" open>
        <summary>
          <span className="icon" data-i="map" aria-hidden="true" />
          <span>{t(locale, 'courses.lesson.nav')}</span>
          <span className="chev">›</span>
        </summary>
        <div className="side__top">
          <div className="ttl">{program.title}</div>
          <div className="progressbar" aria-label={t(locale, 'courses.progress.label')}>
            <div className="progressbar__track">
              <div className="progressbar__fill" style={{ width: `${overall.pct}%` }} />
            </div>
            <span className="progressbar__txt">
              {overall.done}/{overall.total} {t(locale, 'courses.progress.unit')}
            </span>
          </div>
        </div>
        <nav className="navlist" aria-label={t(locale, 'courses.lesson.navStages')}>
          {phases.map((p) => {
            const rows = sorted.filter((l) => l.phaseId === p.letter)
            const pp = byPhase.get(p.letter ?? '') ?? { done: 0, total: rows.length }
            return (
              <div className="navphase" key={p.letter}>
                <div className="navphase__h">
                  <span className="lp">{p.letter}</span>
                  <span className="nm">{p.name}</span>
                  <span className="ct">{pp.done}/{pp.total}</span>
                </div>
                {rows.map((l) => {
                  const current = l.id === lesson.id
                  const isDone = completedIds.has(l.id)
                  const locked =
                    maxUnlockedNr != null && typeof l.nr === 'number' && l.nr > maxUnlockedNr
                  if (locked) {
                    return (
                      <span
                        key={l.id}
                        className="navitem locked"
                        aria-disabled="true"
                        title={t(locale, 'courses.lesson.locked')}
                      >
                        <span className="st">
                          <span className="icon" data-i="lock" aria-hidden="true" />
                        </span>
                        <span className="lbl">{l.title}</span>
                        <span className="nr">{pad(l.nr)}</span>
                      </span>
                    )
                  }
                  return (
                    <Link
                      key={l.id}
                      className={`navitem${l.hardGate ? ' gate' : ''}${isDone ? ' done' : ''}`}
                      href={getLocalizedPath(`/${slug}/learn/${l.slug}`, locale)}
                      aria-current={current ? 'true' : undefined}
                    >
                      <span className="st">
                        {isDone ? (
                          <span className="icon" data-i="check" aria-hidden="true" />
                        ) : l.hardGate ? (
                          <span className="icon" data-i="lock" aria-hidden="true" />
                        ) : null}
                      </span>
                      <span className="lbl">{l.title}</span>
                      <span className="nr">{pad(l.nr)}</span>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>
      </details>
    </aside>
  )
}
