import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // overrideAccess: false + user enforces enrolledOrAdmin read access on the lesson.
  // A non-enrolled, non-admin user is denied (Forbidden thrown) -> caught -> 403.
  // A missing lesson also throws (NotFound) -> caught -> 403 (no info leak about existence).
  let lesson
  try {
    lesson = await payload.findByID({
      collection: 'lessons',
      id,
      depth: 1,
      overrideAccess: false,
      user,
    })
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const file: any = lesson?.downloadFile
  if (!file?.url) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.redirect(new URL(file.url, process.env.NEXT_PUBLIC_SERVER_URL))
}
