import { getPayload } from 'payload'
import configPromise from '@payload-config'
import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

import type { Lesson, Program } from '@/payload-types'
import { t } from '@/i18n'
import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { LessonView } from '../../../_components/LessonView'
import { getCompletedLessonIds } from '@/utilities/courseProgress'
import { extractHeadings } from '@/utilities/lessonHeadings'
import type { CohortClock } from '@/utilities/cohortUnlock'

export const dynamic = 'force-dynamic'

export default async function CourseLessonPage({
  params,
}: {
  params: Promise<{ slug: string; lesson: string }>
}) {
  const { slug, lesson: lessonSlug } = await params
  const locale = await getLocale()
  const payload = await getPayload({ config: configPromise })

  // ---- Gate (mirrors src/app/(frontend)/learn/[program]/[lesson]/page.tsx) ----
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    const next = getLocalizedPath(`/${slug}/learn/${lessonSlug}`, locale)
    redirect(`${getLocalizedPath('/login', locale)}?next=${encodeURIComponent(next)}`)
  }

  // Syllabus is public marketing, so resolving the program by slug can safely
  // override access. The enrollment check + lesson query below gate the CONTENT.
  const prog = await payload.find({
    collection: 'program',
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
    depth: 0,
    locale,
  })
  const program = prog.docs[0]
  if (!program) redirect(getLocalizedPath('/', locale))

  const purchased = (user.purchases ?? []).map((p) =>
    typeof p === 'object' && p ? p.id : p,
  )
  const isAdmin = Array.isArray(user.roles) && user.roles.includes('admin')
  // Not enrolled → paywall = the syllabus page for this course.
  if (!isAdmin && !purchased.includes(program.id)) redirect(getLocalizedPath(`/${slug}`, locale))

  // Cohort mode: compute the highest unlocked day ONCE (reused for the lock
  // screen below). The lesson query stays access-checked (overrideAccess: false)
  // so `enrolledOrAdmin` from Task 5 already hides locked lessons — this block
  // only lets us tell "locked" (lock screen) apart from "not found" (404).
  // null = self-paced or admin → zero behaviour change.
  let maxUnlockedNr: number | null = null
  let cohortClock: CohortClock | null = null
  if (program.deliveryMode === 'cohort' && !isAdmin) {
    const { cohortMembership, clockFor } = await import('@/utilities/cohortClock')
    const { maxUnlockedDay } = await import('@/utilities/cohortUnlock')
    const membership = await cohortMembership(payload, user.id, program.id)
    cohortClock = membership ? clockFor(program as Program, membership.cohort) : null
    if (!cohortClock) redirect(getLocalizedPath(`/${slug}`, locale)) // brak kohorty/configu → sylabus
    maxUnlockedNr = maxUnlockedDay(cohortClock)
  }

  // overrideAccess: false + user enforces `enrolledOrAdmin` read access on
  // lessons (defense-in-depth: the query is access-checked even if the guard
  // above were bypassed). 404 if the lesson does not exist in this course.
  const found = await payload.find({
    collection: 'lessons',
    where: {
      and: [{ program: { equals: program.id } }, { slug: { equals: lessonSlug } }],
    },
    limit: 1,
    overrideAccess: false,
    user,
    depth: 1,
    locale,
  })
  const lesson = found.docs[0]
  if (!lesson) {
    // The access layer hid it. Distinguish "still locked" (lock screen with an
    // unlock label) from "does not exist" (404). Fetch METADATA only — the
    // lesson content must never leave the server for a locked lesson.
    if (maxUnlockedNr !== null && cohortClock) {
      const meta = await payload.find({
        collection: 'lessons',
        where: {
          and: [{ program: { equals: program.id } }, { slug: { equals: lessonSlug } }],
        },
        limit: 1,
        overrideAccess: true,
        depth: 0,
        locale,
        select: { title: true, nr: true },
      })
      const locked = meta.docs[0]
      if (locked && typeof locked.nr === 'number' && locked.nr > maxUnlockedNr) {
        const { unlockLabel } = await import('@/utilities/cohortUnlock')
        return (
          <section className="shell" style={{ padding: 'clamp(64px, 10vw, 120px) 0' }}>
            <div
              style={{
                maxWidth: '520px',
                background: 'var(--surface-1)',
                border: '1px solid var(--line-soft)',
                borderRadius: 'var(--r-card)',
                padding: 'clamp(24px, 4vw, 40px)',
              }}
            >
              <span className="eyebrow">
                <span className="icon" data-i="lock" aria-hidden="true" />
                <i>{t(locale, 'courses.lesson.lockedEyebrow')}</i>
              </span>
              <h1 className="section-title" style={{ marginTop: '16px', marginBottom: '12px' }}>
                {locked.title}
              </h1>
              <p style={{ marginBottom: '24px', opacity: 0.7 }}>
                {unlockLabel(locked.nr, cohortClock)}
              </p>
              <Link className="btn btn--primary" href={getLocalizedPath(`/${slug}/dzisiaj`, locale)}>
                <span>{t(locale, 'courses.lesson.lockedCta')}</span>
                <span className="icon" data-i="arrow" aria-hidden="true" />
              </Link>
            </div>
          </section>
        )
      }
    }
    notFound()
  }

  // ---- Data for the data-driven Lekcja render ----
  // All course lessons sorted by `nr` → pager neighbours + sidebar phase lists.
  const allRes = await payload.find({
    collection: 'lessons',
    where: { program: { equals: program.id } },
    sort: 'nr',
    limit: 1000,
    overrideAccess: true,
    depth: 0,
    locale,
  })
  const allLessons = allRes.docs as Lesson[]

  const completedIds = await getCompletedLessonIds(payload, user.id, program.id)
  const headings = extractHeadings((lesson as Lesson).content)

  return (
    <LessonView
      slug={slug}
      program={program as Program}
      lesson={lesson as Lesson}
      allLessons={allLessons}
      completedIds={completedIds}
      headings={headings}
      locale={locale}
      maxUnlockedNr={maxUnlockedNr}
      cohortClock={cohortClock}
    />
  )
}
