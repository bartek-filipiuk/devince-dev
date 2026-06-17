import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { courseMeta } from '@/utilities/courseMeta'
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

  const payload = await getPayload({ config: configPromise })

  const res = await payload.find({
    collection: 'program',
    where: {
      and: [{ type: { equals: 'course' } }, { pricing: { equals: 'paid' } }],
    },
    limit: PER_PAGE,
    page,
    overrideAccess: false,
    depth: 0,
  })

  // One extra query for all lessons of the courses on this page, grouped by program.
  const programIds = res.docs.map((p) => p.id)
  const lessonsByProgram = new Map<number, Array<Record<string, unknown>>>()

  if (programIds.length > 0) {
    const lessonsRes = await payload.find({
      collection: 'lessons',
      where: { program: { in: programIds } },
      limit: 1000,
      overrideAccess: true,
      depth: 0,
    })
    for (const lesson of lessonsRes.docs) {
      const pid = typeof lesson.program === 'object' ? lesson.program?.id : lesson.program
      if (pid == null) continue
      const list = lessonsByProgram.get(pid as number) ?? []
      list.push(lesson as unknown as Record<string, unknown>)
      lessonsByProgram.set(pid as number, list)
    }
  }

  return (
    <section className="shell" style={{ padding: '64px 0' }}>
      <header className="store-head">
        <span className="eyebrow">
          <i>Kursy</i>
        </span>
        <h1 className="section-title">Płatne kursy</h1>
      </header>

      {res.docs.length === 0 ? (
        <p className="store-empty">Brak dostępnych kursów.</p>
      ) : (
        <div className="store-grid">
          {res.docs.map((program) => {
            const lessons = (lessonsByProgram.get(program.id) ?? []) as Parameters<
              typeof courseMeta
            >[1]
            const meta = courseMeta(program.phases ?? [], lessons)
            return <CourseCard key={program.id} program={program} meta={meta} />
          })}
        </div>
      )}

      <Pagination page={res.page ?? page} totalPages={res.totalPages ?? 1} />
    </section>
  )
}
