import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import type { Lesson } from '@/payload-types'
import { courseMeta } from '@/utilities/courseMeta'
import { SyllabusHero } from '../_components/SyllabusHero'
import { Outcomes } from '../_components/Outcomes'
import { Curriculum } from '../_components/Curriculum'
import { InfoCards } from '../_components/InfoCards'
import { CtaBand } from '../_components/CtaBand'

export const dynamic = 'force-dynamic'

/** Loads a published course program + its lessons by slug. */
async function getCourse(slug: string) {
  const payload = await getPayload({ config: configPromise })

  const res = await payload.find({
    collection: 'program',
    where: {
      and: [{ type: { equals: 'course' } }, { slug: { equals: slug } }],
    },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })

  const program = res.docs[0]
  if (!program) return null

  // Syllabus lists titles/metadata only (not gated bodies), so overrideAccess
  // is fine here. Sorted by `nr` so phase rows render in stage order.
  const lessonsRes = await payload.find({
    collection: 'lessons',
    where: { program: { equals: program.id } },
    sort: 'nr',
    limit: 1000,
    overrideAccess: true,
    depth: 0,
  })

  return { program, lessons: lessonsRes.docs as Lesson[] }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const data = await getCourse(slug)
  if (!data) return { title: 'Kurs nie znaleziony · Devince' }

  const { program } = data
  const title = `${program.title} · Devince`
  return {
    title,
    description: program.heroDescription ?? undefined,
  }
}

export default async function SyllabusPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await getCourse(slug)
  if (!data) notFound()

  const { program, lessons } = data
  const phases = program.phases ?? []
  const meta = courseMeta(phases, lessons)

  // First lesson = lowest nr (lessons are already sorted by nr).
  const firstLessonSlug = lessons[0]?.slug ?? null

  // phaseId → lesson count, for the hero spine and any „X et." labels.
  const stageCounts = new Map<string, number>()
  for (const lesson of lessons) {
    if (!lesson.phaseId) continue
    stageCounts.set(lesson.phaseId, (stageCounts.get(lesson.phaseId) ?? 0) + 1)
  }

  return (
    <>
      <SyllabusHero
        program={program}
        meta={meta}
        phases={phases}
        stageCounts={stageCounts}
        firstLessonSlug={firstLessonSlug}
      />

      <div className="shell">
        <Outcomes outcomes={program.outcomes ?? []} />

        <Curriculum slug={program.slug} phases={phases} lessons={lessons} />

        <section className="block">
          <InfoCards audience={program.audience ?? []} requirements={program.requirements ?? []} />
          <CtaBand program={program} firstLessonSlug={firstLessonSlug} />
        </section>
      </div>
    </>
  )
}
