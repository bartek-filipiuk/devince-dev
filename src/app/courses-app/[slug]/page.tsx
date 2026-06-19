import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import type { Lesson } from '@/payload-types'
import type { Locale } from '@/i18n'
import { courseMeta } from '@/utilities/courseMeta'
import { getLocale } from '@/utilities/getLocale.server'
import { t } from '@/i18n'
import { SyllabusHero } from '../_components/SyllabusHero'
import { Outcomes } from '../_components/Outcomes'
import { Curriculum } from '../_components/Curriculum'
import { InfoCards } from '../_components/InfoCards'
import { CtaBand } from '../_components/CtaBand'
import { RenderCourseLanding } from '@/blocks/course/RenderCourseLanding'

export const dynamic = 'force-dynamic'

/** Loads a published course program + its lessons by slug. */
async function getCourse(slug: string, locale: Locale) {
  const payload = await getPayload({ config: configPromise })

  const res = await payload.find({
    collection: 'program',
    where: {
      // `_status: published` is REQUIRED here: this page is public + uses
      // overrideAccess:true (to populate media), so without it a draft/unpublished
      // course would render its full syllabus/landing/pricing to anyone who knows
      // the slug. The checkout route already gates on published; this matches it.
      and: [
        { type: { equals: 'course' } },
        { slug: { equals: slug } },
        { _status: { equals: 'published' } },
      ],
    },
    limit: 1,
    overrideAccess: true,
    // depth 1 populates upload relations (heroImage, meta.image and the
    // landing `courseImage` blocks) so images render; lessons load separately.
    depth: 1,
    locale,
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
    locale,
  })

  return { program, lessons: lessonsRes.docs as Lesson[] }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const locale = await getLocale()
  const data = await getCourse(slug, locale)
  if (!data) return { title: t(locale, 'courses.syllabus.metaNotFound') }

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
  const locale = await getLocale()
  const data = await getCourse(slug, locale)
  if (!data) notFound()

  const { program, lessons } = data
  const phases = program.phases ?? []
  const meta = courseMeta(phases, lessons)

  // Enrollment: admins + anyone who has this program in their purchases.
  // Drives the CTA — non-enrolled visitors of a paid course see a buy button.
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  const enrolled =
    !!user &&
    ((user.roles ?? []).includes('admin') ||
      (user.purchases ?? []).some((p) => (typeof p === 'object' && p ? p.id : p) === program.id))

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
        enrolled={enrolled}
        locale={locale}
      />

      {program.landing?.length ? (
        <div className="shell">
          <RenderCourseLanding blocks={program.landing} locale={locale} />
        </div>
      ) : null}

      <div className="shell">
        <Outcomes outcomes={program.outcomes ?? []} locale={locale} />

        <Curriculum slug={program.slug} phases={phases} lessons={lessons} locale={locale} />

        <section className="block">
          <InfoCards
            audience={program.audience ?? []}
            requirements={program.requirements ?? []}
            locale={locale}
          />
          <CtaBand
            program={program}
            firstLessonSlug={firstLessonSlug}
            enrolled={enrolled}
            locale={locale}
          />
        </section>
      </div>
    </>
  )
}
