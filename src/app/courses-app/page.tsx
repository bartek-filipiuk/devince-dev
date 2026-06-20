import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'

import { courseMeta } from '@/utilities/courseMeta'
import { courseStatus, compareStorefront, progressFor } from '@/utilities/courseProgress'
import { getLocale } from '@/utilities/getLocale.server'
import { t } from '@/i18n'
import { CourseCard } from './_components/CourseCard'
import { Pagination } from './_components/Pagination'

export const dynamic = 'force-dynamic'

const PER_PAGE = 9

/**
 * Courses storefront for courses.devince.dev — a paginated list of paid,
 * published courses (Program docs with type='course', pricing='paid').
 *
 * Per-card meta (phases / stages / hard gates / est-time) is computed via the
 * courseMeta helper from one extra lessons query, grouped by program id.
 */
export default async function CoursesStorefront({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)
  const locale = await getLocale()

  const payload = await getPayload({ config: configPromise })

  // Fetch the viewer once so each card can decide buy vs details.
  const { user } = await payload.auth({ headers: await headers() })
  const isAdmin = !!user && (user.roles ?? []).includes('admin')
  const purchasedIds = new Set(
    (user?.purchases ?? []).map((p) => (typeof p === 'object' && p ? p.id : p)),
  )

  // Fetch ALL paid+published courses — we sort by per-user progress (not a DB
  // column), so pagination happens in memory below.
  const res = await payload.find({
    collection: 'program',
    where: { and: [{ type: { equals: 'course' } }, { pricing: { equals: 'paid' } }] },
    limit: 100,
    overrideAccess: false,
    depth: 0,
    locale,
  })
  const allCourses = res.docs

  const programIds = allCourses.map((p) => p.id)
  const lessonsByProgram = new Map<number, Array<Record<string, unknown>>>()
  if (programIds.length > 0) {
    const lessonsRes = await payload.find({
      collection: 'lessons',
      where: { program: { in: programIds } },
      limit: 1000,
      overrideAccess: true,
      depth: 0,
      locale,
    })
    for (const lesson of lessonsRes.docs) {
      const pid = typeof lesson.program === 'object' ? lesson.program?.id : lesson.program
      if (pid == null) continue
      const list = lessonsByProgram.get(pid as number) ?? []
      list.push(lesson as unknown as Record<string, unknown>)
      lessonsByProgram.set(pid as number, list)
    }
  }

  // Per-user completed-lesson counts (logged-in only).
  const doneByProgram = new Map<number, number>()
  if (user && programIds.length > 0) {
    const progRes = await payload.find({
      collection: 'lesson-progress',
      where: { and: [{ user: { equals: user.id } }, { program: { in: programIds } }] },
      limit: 0,
      overrideAccess: true,
      depth: 0,
    })
    for (const row of progRes.docs) {
      const pid = typeof row.program === 'object' && row.program ? row.program.id : row.program
      if (pid == null) continue
      doneByProgram.set(pid as number, (doneByProgram.get(pid as number) ?? 0) + 1)
    }
  }

  const items = allCourses.map((program) => {
    const rawLessons = lessonsByProgram.get(program.id) ?? []
    const lessons = rawLessons as Parameters<typeof courseMeta>[1] & Array<unknown>
    const meta = courseMeta(program.phases ?? [], lessons)
    const enrolled = isAdmin || purchasedIds.has(program.id)
    const total = rawLessons.length
    const done = doneByProgram.get(program.id) ?? 0
    return {
      program,
      meta,
      enrolled,
      status: courseStatus(done, total),
      pct: progressFor(total, done).pct,
      featured: !!program.featured,
      publishedAt: program.publishedAt ?? null,
    }
  })
  items.sort(compareStorefront)

  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE))
  const pageItems = items.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <section className="shell" style={{ padding: '64px 0' }}>
      <header className="store-head">
        <span className="eyebrow">
          <i>{t(locale, 'courses.store.eyebrow')}</i>
        </span>
        <h1 className="section-title">{t(locale, 'courses.store.title')}</h1>
      </header>

      {pageItems.length === 0 ? (
        <p className="store-empty">{t(locale, 'courses.store.empty')}</p>
      ) : (
        <div className="store-grid">
          {pageItems.map(({ program, meta, enrolled, status, pct, featured }) => (
            <CourseCard
              key={program.id}
              program={program}
              meta={meta}
              enrolled={enrolled}
              featured={featured}
              status={user ? status : undefined}
              pct={pct}
              locale={locale}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} locale={locale} />
    </section>
  )
}
