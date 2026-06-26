import { NextRequest } from 'next/server'
import type { File } from 'payload'
import { validateAuth } from '../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../_lib/errors.js'
import { getPayloadClient } from '../_lib/payload.js'
import { readList } from '../_lib/read.js'

export async function GET(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError
  try {
    const payload = await getPayloadClient()
    return readList(payload, 'app-assets', request)
  } catch (error) {
    return handleRouteError('List app-assets', error)
  }
}

// Downloadable products can be large (bundles, archives) — allow up to 200MB.
// Unlike /media (images only), no mimetype allow-list: app-assets are private,
// admin-gated, and only ever delivered through the grant-gated download route.
const MAX_FILE_SIZE = 200 * 1024 * 1024

/**
 * POST /api/external/app-assets — upload a private downloadable file (multipart,
 * field `file`, optional `alt`). Returns the created app-asset id + filename to
 * use as a `downloadFiles` entry when creating a product.
 *
 * Auth: Bearer EXTERNAL_API_TOKEN. The file lands in the private `app-assets`
 * collection (staticDir /app/private-media-apps), never publicly served.
 */
export async function POST(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError

  try {
    const formData = await request.formData()
    const uploaded = formData.get('file')
    const rawAlt = formData.get('alt')

    if (rawAlt !== null && typeof rawAlt !== 'string') {
      return createErrorResponse('VALIDATION_ERROR', 'alt must be a string')
    }

    if (!uploaded || !(uploaded instanceof Blob)) {
      return createErrorResponse('VALIDATION_ERROR', 'file field is required')
    }
    if (uploaded.size === 0) {
      return createErrorResponse('VALIDATION_ERROR', 'file is empty')
    }
    if (uploaded.size > MAX_FILE_SIZE) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      )
    }

    const arrayBuffer = await uploaded.arrayBuffer()
    const file: File = {
      name: (uploaded as globalThis.File).name || `asset-${Date.now()}`,
      data: Buffer.from(arrayBuffer),
      mimetype: uploaded.type || 'application/octet-stream',
      size: uploaded.size,
    }

    const payload = await getPayloadClient()
    const asset = await payload.create({
      collection: 'app-assets',
      data: { ...(rawAlt && { alt: rawAlt }) },
      file,
    })

    return createSuccessResponse(
      {
        id: asset.id,
        filename: asset.filename ?? null,
        mimeType: asset.mimeType ?? null,
        filesize: asset.filesize ?? null,
      },
      201,
    )
  } catch (error) {
    return handleRouteError('Upload app-asset', error)
  }
}
