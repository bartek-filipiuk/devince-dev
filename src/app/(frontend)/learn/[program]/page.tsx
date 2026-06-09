import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ProgramLessonsPage({
  params,
}: {
  params: Promise<{ program: string }>
}) {
  const { program: programSlug } = await params
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect(`/login?next=/learn/${programSlug}`)

  // Program landing pages are public marketing; resolving by slug may override access.
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

  // overrideAccess: false + user enforces enrolledOrAdmin read access on lessons.
  const lessons = await payload.find({
    collection: 'lessons',
    where: { program: { equals: program.id } },
    sort: 'order',
    limit: 1000,
    overrideAccess: false,
    user,
  })

  return (
    <article className="learn-program-page">
      <h1>{program.title}</h1>
      {lessons.docs.length === 0 ? (
        <p className="learn-empty">Brak lekcji w tym programie.</p>
      ) : (
        <ol className="lesson-list">
          {lessons.docs.map((lesson) => (
            <li key={lesson.id} className="lesson-list-item">
              <Link href={`/learn/${programSlug}/${lesson.slug}`} className="lesson-list-link">
                {lesson.title}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}
