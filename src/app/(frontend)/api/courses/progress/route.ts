import { NextRequest, NextResponse } from 'next/server'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { isEnrolled } from '@/utilities/courseProgress'

export async function POST(req: NextRequest) {
  let lessonId: unknown
  let completed: unknown
  try {
    ;({ lessonId, completed } = await req.json())
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  if (typeof lessonId !== 'number' || typeof completed !== 'boolean') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await nextHeaders() })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const lesson = await payload
    .findByID({ collection: 'lessons', id: lessonId, overrideAccess: true, depth: 0 })
    .catch(() => null)
  if (!lesson) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const programId =
    typeof lesson.program === 'object' && lesson.program ? lesson.program.id : (lesson.program as number)

  // Server-side trust boundary: never record progress for a course the caller
  // does not own.
  if (!isEnrolled(user, programId)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const existing = await payload.find({
    collection: 'lesson-progress',
    where: { and: [{ user: { equals: user.id } }, { lesson: { equals: lessonId } }] },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })
  const row = existing.docs[0]

  if (completed && !row) {
    try {
      await payload.create({
        collection: 'lesson-progress',
        data: { user: user.id, lesson: lessonId, program: programId, completedAt: new Date().toISOString() },
        overrideAccess: true,
      })
    } catch {
      // Unique (user,lesson) race on a concurrent double-complete → already done.
    }
  } else if (!completed && row) {
    await payload.delete({ collection: 'lesson-progress', id: row.id, overrideAccess: true })
  }

  const all = await payload.find({
    collection: 'lesson-progress',
    where: { and: [{ user: { equals: user.id } }, { program: { equals: programId } }] },
    limit: 0,
    overrideAccess: true,
    depth: 0,
  })
  const total = await payload.find({
    collection: 'lessons',
    where: { program: { equals: programId } },
    limit: 0,
    overrideAccess: true,
    depth: 0,
  })

  return NextResponse.json({ completed, completedCount: all.totalDocs, total: total.totalDocs })
}

export const dynamic = 'force-dynamic'
