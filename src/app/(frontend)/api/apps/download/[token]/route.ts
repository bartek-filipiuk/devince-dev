import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { resolveGrant } from '@/utilities/resolveGrant'

// Private staticDir for `app-assets` (mirrors AppAssets.upload.staticDir).
// Files live OUTSIDE public/, so they are never served as static assets — the
// only way to fetch them is through this grant-gated route.
const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const PRIVATE_MEDIA_DIR = path.resolve(
  dirname,
  // route file: src/app/(frontend)/api/apps/download/[token]/route.ts
  // private dir: <repoRoot>/private-media-apps
  // Same nesting depth as the course download route (7 segments up = 7 `../`).
  '../../../../../../../private-media-apps',
)

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const payload = await getPayload({ config: configPromise })

  const resolved = await resolveGrant(payload, token)

  // Return a uniform 403 for all non-ok states (invalid token, expired grant,
  // exhausted uses). No status detail is leaked to the caller — leaking
  // 'expired' vs 'invalid' could help an attacker enumerate grant states.
  if (resolved.status !== 'ok') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { grant, product } = resolved

  // Resolve the requested file id from the ?file= query param, validating
  // that it belongs to the product's downloadFiles list.
  const url = new URL(req.url)
  const fileParam = url.searchParams.get('file')

  // Normalize downloadFiles: depth 0, so items are numbers or populated objects.
  const downloadFiles = (product.downloadFiles ?? []).map((f) =>
    typeof f === 'object' && f !== null ? f.id : f,
  )

  let assetId: number
  if (fileParam !== null) {
    const requested = Number(fileParam)
    if (!downloadFiles.includes(requested)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    assetId = requested
  } else if (downloadFiles.length === 1) {
    assetId = downloadFiles[0]!
  } else if (downloadFiles.length === 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  } else {
    // Multiple files and no ?file= param — the caller must specify which file.
    return NextResponse.json({ error: 'file parameter required' }, { status: 400 })
  }

  // Load the private asset with overrideAccess (app-assets read is admin-only;
  // the gate here is the grant check above, not the asset's own access).
  let asset
  try {
    asset = await payload.findByID({
      collection: 'app-assets',
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
  if (absPath !== PRIVATE_MEDIA_DIR && !absPath.startsWith(PRIVATE_MEDIA_DIR + path.sep)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  // Increment uses BEFORE streaming. There is an inherent race: two concurrent
  // requests with the same token could both pass the limit check and both
  // increment — this is acceptable because maxUses is a soft throttle (not a
  // payment boundary) and a double-serve on the last available use is low risk.
  await payload.update({
    collection: 'download-grants',
    id: grant.id,
    data: { uses: (grant.uses ?? 0) + 1 },
    overrideAccess: true,
  })

  let bytes: Buffer
  try {
    bytes = await fs.readFile(absPath)
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const contentType =
    (typeof asset?.mimeType === 'string' && asset.mimeType) || 'application/octet-stream'
  // Quote-escape the filename for the Content-Disposition header.
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
