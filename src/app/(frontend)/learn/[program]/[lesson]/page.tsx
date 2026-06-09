import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import RichText from '@/components/RichText'

export const dynamic = 'force-dynamic'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ program: string; lesson: string }>
}) {
  const { program: programSlug, lesson: lessonSlug } = await params
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect(`/login?next=/learn/${programSlug}/${lessonSlug}`)

  // Program landing pages are public marketing, so resolving the program by slug
  // can safely override access. The gate below restricts the lesson CONTENT.
  const prog = await payload.find({
    collection: 'program',
    where: { slug: { equals: programSlug } },
    limit: 1,
    overrideAccess: true,
  })
  const program = prog.docs[0]
  if (!program) redirect('/account')

  const purchased = (user.purchases ?? []).map((p: any) => (typeof p === 'object' && p ? p.id : p))
  const isAdmin = Array.isArray(user.roles) && user.roles.includes('admin')
  if (!isAdmin && !purchased.includes(program.id)) redirect(`/program/${programSlug}`)

  // overrideAccess: false + user enforces enrolledOrAdmin read access on lessons
  // (defense-in-depth: even if the guard above is bypassed, the query is access-checked).
  const found = await payload.find({
    collection: 'lessons',
    where: { and: [{ program: { equals: program.id } }, { slug: { equals: lessonSlug } }] },
    limit: 1,
    overrideAccess: false,
    user,
  })
  const lesson = found.docs[0]
  if (!lesson) redirect('/account')

  return (
    <article className="lesson-page">
      <h1>{lesson.title}</h1>
      {lesson.youtubeEmbedUrl && (
        <div className="lesson-video">
          <iframe src={lesson.youtubeEmbedUrl} allowFullScreen title={lesson.title} />
        </div>
      )}
      {lesson.content && <RichText data={lesson.content as any} />}
    </article>
  )
}
