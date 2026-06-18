import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

import type { Lesson, Program } from '@/payload-types'
import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { LessonView } from '../../../_components/LessonView'

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
  if (!lesson) notFound()

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

  return (
    <LessonView
      slug={slug}
      program={program as Program}
      lesson={lesson as Lesson}
      allLessons={allLessons}
      locale={locale}
    />
  )
}
