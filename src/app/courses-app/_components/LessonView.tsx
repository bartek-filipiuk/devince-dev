import Link from 'next/link'
import { Fragment } from 'react'
import type { Lesson, Program } from '@/payload-types'
import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
import { t, type Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'
import type { LessonHeading } from '@/utilities/lessonHeadings'
import { LessonSidebar } from './LessonSidebar'
import { CourseLessonProse } from './CourseLessonProse'
import { TableOfContents } from './TableOfContents'
import { MarkCompleteButton } from './MarkCompleteButton'

type Phase = NonNullable<Program['phases']>[number]
const pad = (n: number | null | undefined) => String(n ?? 0).padStart(2, '0')

function toParagraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
}
function Paragraphs({ text, lead }: { text: string; lead?: boolean }) {
  return (
    <>
      {toParagraphs(text).map((para, i) => (
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

export function LessonView({ slug, program, lesson, allLessons, completedIds, headings, locale, maxUnlockedNr }: {
  slug: string
  program: Program
  lesson: Lesson
  allLessons: Lesson[]
  completedIds: Set<number>
  headings: LessonHeading[]
  locale: Locale
  maxUnlockedNr?: number | null
}) {
  const phases: Phase[] = program.phases ?? []
  const sorted = [...allLessons].sort((a, b) => (a.nr ?? 0) - (b.nr ?? 0))
  const idx = sorted.findIndex((l) => l.id === lesson.id)
  const prev = idx > 0 ? sorted[idx - 1] : null
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null
  // Cohort mode: the next lesson may still be locked. Show a gated label rather
  // than a dead link (self-paced / admin → maxUnlockedNr null → never locked).
  const nextLocked =
    !!next && maxUnlockedNr != null && typeof next.nr === 'number' && next.nr > maxUnlockedNr
  const phase = phases.find((p) => p.letter === lesson.phaseId) ?? null
  const deps = (lesson.dependencies ?? []).filter(
    (d): d is Lesson => typeof d === 'object' && d !== null,
  )
  const skills = (lesson.skills ?? []).map((s) => s.skill).filter(Boolean)
  const nextHref = next && !nextLocked ? getLocalizedPath(`/${slug}/learn/${next.slug}`, locale) : null

  const timeMin = lesson.estTimeMin?.min ?? 0
  const timeMax = lesson.estTimeMin?.max ?? 0
  const timeLabel =
    timeMax > 0 ? `${timeMin && timeMin !== timeMax ? `${timeMin}–` : '~'}${timeMax} ${t(locale, 'courses.lesson.readMin')}` : null

  return (
    <div className="lesson">
      <LessonSidebar
        slug={slug}
        program={program}
        lesson={lesson}
        sorted={sorted}
        completedIds={completedIds}
        locale={locale}
        maxUnlockedNr={maxUnlockedNr}
      />

      <main className="lmain" id="lmain">
        <div className="crumb">
          <Link href={getLocalizedPath(`/${slug}`, locale)}>{t(locale, 'courses.lesson.syllabus')}</Link>
          {phase ? (
            <>
              <span className="sep">/</span>
              <span>{t(locale, 'courses.lesson.phase')} {phase.letter} · {phase.name}</span>
            </>
          ) : null}
          <span className="sep">/</span>
          <span>{t(locale, 'courses.lesson.stage')} {pad(lesson.nr)} / {pad(sorted.length)}</span>
        </div>

        <header className="lhead">
          <h1>{lesson.title}</h1>
          <div className="lhead__meta">
            {timeLabel ? <span className="lmeta">{timeLabel}</span> : null}
            <div className="badges">
              {lesson.hardGate ? <span className="badge gate">{t(locale, 'courses.badge.gate')}</span> : null}
              {lesson.hybrid ? <span className="badge hybrid">{t(locale, 'courses.badge.hybrid')}</span> : null}
              {lesson.kind === 'decision' ? <span className="badge decision">{t(locale, 'courses.badge.decision')}</span> : null}
            </div>
          </div>
        </header>

        {lesson.why ? (
          <section className="lsec lintro">
            <Paragraphs text={lesson.why} lead />
          </section>
        ) : null}

        {lesson.youtubeEmbedUrl ? (
          <div className="lvideo">
            <div className="lvideo__frame">
              <iframe
                src={lesson.youtubeEmbedUrl}
                title={lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : null}

        {lesson.content ? (
          <CourseLessonProse content={lesson.content as DefaultTypedEditorState} locale={locale} />
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
              <div className="dod__body"><Paragraphs text={lesson.dod} /></div>
            </div>
          </section>
        ) : null}

        {skills.length ? (
          <section className="lsec">
            <div className="lbl">{t(locale, 'courses.lesson.skills')}</div>
            <div className="chips">
              {skills.map((s, i) => <span className="chip" key={i}>{s}</span>)}
            </div>
          </section>
        ) : null}

        {deps.length ? (
          <section className="lsec">
            <div className="lbl">{t(locale, 'courses.lesson.deps')}</div>
            <div className="deplist">
              {deps.map((d) => (
                <Link className="deprow" href={getLocalizedPath(`/${slug}/learn/${d.slug}`, locale)} key={d.id}>
                  <span className="dn">{pad(d.nr)}</span>
                  <span className="dnm">{d.title}</span>
                  <span className="go"><span className="icon" data-i="arrow" aria-hidden="true" /></span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className="lsec markdone-wrap">
          <MarkCompleteButton
            lessonId={lesson.id}
            initialDone={completedIds.has(lesson.id)}
            nextHref={nextHref}
            labels={{
              complete: t(locale, 'courses.lesson.markComplete'),
              completeLast: t(locale, 'courses.lesson.markCompleteLast'),
              completed: t(locale, 'courses.lesson.completed'),
              undo: t(locale, 'courses.lesson.undo'),
            }}
          />
        </div>

        <nav className="pager" aria-label={t(locale, 'courses.lesson.pagerLabel')}>
          {prev ? (
            <Link className="pg" href={getLocalizedPath(`/${slug}/learn/${prev.slug}`, locale)}>
              <span className="k"><span className="icon" data-i="back" aria-hidden="true" />{t(locale, 'courses.lesson.prev')}</span>
              <span className="v">{pad(prev.nr)} · {prev.title}</span>
            </Link>
          ) : (
            <div className="pg disabled"><span className="k">{t(locale, 'courses.lesson.start')}</span><span className="v">—</span></div>
          )}
          {next && nextLocked ? (
            <div className="pg next disabled locked" aria-disabled="true">
              <span className="k">{t(locale, 'courses.lesson.locked')}<span className="icon" data-i="lock" aria-hidden="true" /></span>
              <span className="v">{pad(next.nr)} · {next.title}</span>
            </div>
          ) : next ? (
            <Link className="pg next" href={getLocalizedPath(`/${slug}/learn/${next.slug}`, locale)}>
              <span className="k">{t(locale, 'courses.lesson.next')}<span className="icon" data-i="arrow" aria-hidden="true" /></span>
              <span className="v">{pad(next.nr)} · {next.title}</span>
            </Link>
          ) : (
            <div className="pg next disabled"><span className="k">{t(locale, 'courses.lesson.end')}</span><span className="v">—</span></div>
          )}
        </nav>
      </main>

      <TableOfContents headings={headings} label={t(locale, 'courses.lesson.onThisPage')} />
    </div>
  )
}
