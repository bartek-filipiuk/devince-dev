import { NextRequest } from 'next/server'
import type { File } from 'payload'
import { validateAuth } from '../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../_lib/errors.js'
import { getPayloadClient } from '../_lib/payload.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]

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
    const alt = rawAlt

    if (!uploaded || !(uploaded instanceof Blob)) {
      return createErrorResponse('VALIDATION_ERROR', 'file field is required')
    }

    if (uploaded.size > MAX_FILE_SIZE) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      )
    }

    if (!uploaded.type || !ALLOWED_MIMETYPES.includes(uploaded.type)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `Unsupported file type: ${uploaded.type || 'unknown'}. Allowed: ${ALLOWED_MIMETYPES.join(', ')}`,
      )
    }

    const arrayBuffer = await uploaded.arrayBuffer()
    const file: File = {
      name: (uploaded as globalThis.File).name || `upload-${Date.now()}`,
      data: Buffer.from(arrayBuffer),
      mimetype: uploaded.type,
      size: uploaded.size,
    }

    const payload = await getPayloadClient()
    const media = await payload.create({
      collection: 'media',
      data: { ...(alt && { alt }) },
      file,
    })

    return createSuccessResponse(
      {
        id: media.id,
        url: media.url ?? null,
        filename: media.filename ?? null,
        mimeType: media.mimeType ?? null,
        width: media.width ?? null,
        height: media.height ?? null,
        sizes: media.sizes ?? null,
      },
      201,
    )
  } catch (error) {
    return handleRouteError('Upload media', error)
  }
}
