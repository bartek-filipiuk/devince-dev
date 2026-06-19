import Link from 'next/link'
import { Fragment } from 'react'
import type { Lesson, Program } from '@/payload-types'
import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'

type Phase = NonNullable<Program['phases']>[number]

const pad = (n: number | null | undefined) => String(n ?? 0).padStart(2, '0')

/** Splits textarea content on blank/new lines into paragraphs (line breaks kept). */
function toParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/** Renders a textarea string as <p> blocks, preserving single line breaks via <br>. */
function Paragraphs({ text, lead }: { text: string; lead?: boolean }) {
  const paras = toParagraphs(text)
  return (
    <>
      {paras.map((para, i) => (
        <p key={i} className={lead && i === 0 ? 'lead' : undefined}>
          {para.split('\n').map((line, j, arr) => (
            <Fragment key={j}>
              {line}
              {j < arr.length - 1 ? <br /> : null}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  )
}

/**
 * Data-driven recreation of the handoff `Lekcja.html` — the gated lesson page
 * under the courses subdomain. Structure/classes mirror the handoff: sticky
 * `.side` sidebar (phase-grouped lesson nav with the current one highlighted),
 * `.lmain` with crumb, `.lhead` (phase chip + „Etap {nr}" + title + badges),
 * the video (responsive iframe or striped `.ph-video` placeholder), `.lsec`
 * sections (Po co / Co robisz / Definition of Done), `.chips` skills,
 * `.deplist` dependencies, and the prev/next `.pager`. PL-only.
 */
export function LessonView({
  slug,
  program,
  lesson,
  allLessons,
  locale,
}: {
  slug: string
  program: Program
  lesson: Lesson
  allLessons: Lesson[]
  locale: Locale
}) {
  const phases: Phase[] = program.phases ?? []
  const sorted = [...allLessons].sort((a, b) => (a.nr ?? 0) - (b.nr ?? 0))

  const idx = sorted.findIndex((l) => l.id === lesson.id)
  const prev = idx > 0 ? sorted[idx - 1] : null
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null

  const phase = phases.find((p) => p.letter === lesson.phaseId) ?? null

  // Dependencies: only resolved (populated) lessons can be linked by slug.
  const deps = (lesson.dependencies ?? []).filter(
    (d): d is Lesson => typeof d === 'object' && d !== null,
  )
  const skills = (lesson.skills ?? []).map((s) => s.skill).filter(Boolean)

  // Sidebar: every phase with its lessons (by nr), current one highlighted.
  const sidebarPhases = phases.map((p) => ({
    phase: p,
    rows: sorted.filter((l) => l.phaseId === p.letter),
  }))

  return (
    <div className="lesson">
      <aside className="side">
        <details className="navwrap" open>
          <summary>
            <span className="icon" data-i="map" aria-hidden="true" />
            <span>{t(locale, 'courses.lesson.nav')}</span>
            <span className="chev">›</span>
          </summary>
          <div className="side__top">
            <div className="ttl">{program.title}</div>
            <div className="pmeta">
              <b>{sorted.length}</b>{' '}
              {sorted.length === 1
                ? t(locale, 'courses.lesson.stageSingular')
                : t(locale, 'courses.lesson.stagePlural')}
            </div>
          </div>
          <nav className="navlist" aria-label={t(locale, 'courses.lesson.navStages')}>
            {sidebarPhases.map(({ phase: p, rows }) => (
              <div className="navphase" key={p.letter}>
                <div className="navphase__h">
                  <span className="lp">{p.letter}</span>
                  <span className="nm">{p.name}</span>
                  <span className="ct">
                    {rows.length} {t(locale, 'courses.lesson.stageShort')}
                  </span>
                </div>
                {rows.map((l) => {
                  const current = l.id === lesson.id
                  return (
                    <Link
                      key={l.id}
                      className={`navitem${l.hardGate ? ' gate' : ''}`}
                      href={getLocalizedPath(`/${slug}/learn/${l.slug}`, locale)}
                      aria-current={current ? 'true' : undefined}
                    >
                      <span className="st">
                        {l.hardGate ? (
                          <span className="icon" data-i="lock" aria-hidden="true" />
                        ) : null}
                      </span>
                      <span className="lbl">{l.title}</span>
                      <span className="nr">{pad(l.nr)}</span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
        </details>
      </aside>

      <main className="lmain" id="lmain">
        <div className="crumb">
          <Link href={getLocalizedPath(`/${slug}`, locale)}>
            {t(locale, 'courses.lesson.syllabus')}
          </Link>
          {phase ? (
            <>
              <span className="sep">/</span>
              <span>
                {t(locale, 'courses.lesson.phase')} {phase.letter} · {phase.name}
              </span>
            </>
          ) : null}
          <span className="sep">/</span>
          <span>
            {t(locale, 'courses.lesson.stage')} {pad(lesson.nr)} / {pad(sorted.length)}
          </span>
        </div>

        <header className="lhead">
          <h1>{lesson.title}</h1>
          <div className="badges">
            {lesson.hardGate ? (
              <span className="badge gate">{t(locale, 'courses.badge.gate')}</span>
            ) : null}
            {lesson.hybrid ? (
              <span className="badge hybrid">{t(locale, 'courses.badge.hybrid')}</span>
            ) : null}
            {lesson.kind === 'decision' ? (
              <span className="badge decision">{t(locale, 'courses.badge.decision')}</span>
            ) : null}
          </div>
        </header>

        <div className="lvideo">
          {lesson.youtubeEmbedUrl ? (
            <div className="lvideo__frame">
              <iframe
                src={lesson.youtubeEmbedUrl}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="ph-video">
              <div className="play">
                <span className="icon" data-i="play" aria-hidden="true" />
              </div>
              <span className="ph-label">
                {t(locale, 'courses.lesson.recording')} · {lesson.title}
              </span>
            </div>
          )}
        </div>


        {lesson.why ? (
          <section className="lsec">
            <div className="lbl">{t(locale, 'courses.lesson.why')}</div>
            <Paragraphs text={lesson.why} lead />
          </section>
        ) : null}

        {lesson.what ? (
          <section className="lsec">
            <div className="lbl">{t(locale, 'courses.lesson.what')}</div>
            <Paragraphs text={lesson.what} />
          </section>
        ) : null}

        {lesson.dod ? (
          <section className="lsec">
            <div className="lbl">{t(locale, 'courses.lesson.dod')}</div>
            <div className="dod">
              <span className="icon" data-i="check" aria-hidden="true" />
              <div className="dod__body">
                <Paragraphs text={lesson.dod} />
              </div>
            </div>
          </section>
        ) : null}

        {skills.length ? (
          <section className="lsec">
            <div className="lbl">{t(locale, 'courses.lesson.skills')}</div>
            <div className="chips">
              {skills.map((s, i) => (
                <span className="chip" key={i}>
                  {s}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {deps.length ? (
          <section className="lsec">
            <div className="lbl">{t(locale, 'courses.lesson.deps')}</div>
            <div className="deplist">
              {deps.map((d) => (
                <Link
                  className="deprow"
                  href={getLocalizedPath(`/${slug}/learn/${d.slug}`, locale)}
                  key={d.id}
                >
                  <span className="dn">{pad(d.nr)}</span>
                  <span className="dnm">{d.title}</span>
                  <span className="go">
                    <span className="icon" data-i="arrow" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <nav className="pager" aria-label={t(locale, 'courses.lesson.pagerLabel')}>
          {prev ? (
            <Link className="pg" href={getLocalizedPath(`/${slug}/learn/${prev.slug}`, locale)}>
              <span className="k">
                <span className="icon" data-i="back" aria-hidden="true" />
                {t(locale, 'courses.lesson.prev')}
              </span>
              <span className="v">
                {pad(prev.nr)} · {prev.title}
              </span>
            </Link>
          ) : (
            <div className="pg disabled">
              <span className="k">{t(locale, 'courses.lesson.start')}</span>
              <span className="v">—</span>
            </div>
          )}
          {next ? (
            <Link className="pg next" href={getLocalizedPath(`/${slug}/learn/${next.slug}`, locale)}>
              <span className="k">
                {t(locale, 'courses.lesson.next')}
                <span className="icon" data-i="arrow" aria-hidden="true" />
              </span>
              <span className="v">
                {pad(next.nr)} · {next.title}
              </span>
            </Link>
          ) : (
            <div className="pg next disabled">
              <span className="k">{t(locale, 'courses.lesson.end')}</span>
              <span className="v">—</span>
            </div>
          )}
        </nav>
      </main>
    </div>
  )
}
