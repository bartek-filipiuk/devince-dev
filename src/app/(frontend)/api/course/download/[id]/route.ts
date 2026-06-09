import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

// Private staticDir for `course-assets` (mirrors CourseAssets.upload.staticDir).
// Files live OUTSIDE public/, so they are never served as static assets — the
// only way to fetch them is through this enrollment-gated route.
const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const PRIVATE_MEDIA_DIR = path.resolve(
  dirname,
  // route file: src/app/(frontend)/api/course/download/[id]/route.ts
  // private dir: <repoRoot>/private-media
  '../../../../../../../private-media',
)

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
      depth: 0,
      overrideAccess: false,
      user,
    })
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const fileRef = lesson?.downloadFile
  const assetId = typeof fileRef === 'object' && fileRef ? fileRef.id : fileRef
  if (!assetId) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Enrollment already verified above. Load the private asset with overrideAccess
  // (course-assets read is admin-only; the gate here is the lesson check, not the
  // asset's own access) and STREAM its bytes — no public URL is ever exposed.
  let asset
  try {
    asset = await payload.findByID({
      collection: 'course-assets',
      id: assetId,
      depth: 0,
      overrideAccess: true,
    })
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const storedName = asset?.filename
  if (!storedName) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Resolve strictly within the private dir; reject any path-traversal in filename.
  const absPath = path.resolve(PRIVATE_MEDIA_DIR, storedName)
  if (
    absPath !== PRIVATE_MEDIA_DIR &&
    !absPath.startsWith(PRIVATE_MEDIA_DIR + path.sep)
  ) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  let bytes: Buffer
  try {
    bytes = await fs.readFile(absPath)
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const contentType =
    (typeof asset?.mimeType === 'string' && asset.mimeType) || 'application/octet-stream'
  // Quote-escape the filename for the header.
  const safeName = String(storedName).replace(/["\\\r\n]/g, '_')

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(bytes.byteLength),
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
