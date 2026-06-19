import { NextRequest } from 'next/server'
import { validateAuth } from '../../../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../../../_lib/errors.js'
import {
  getPayloadClient,
  parseLocale,
  resolveDocId,
  isErrorResponse,
} from '../../../_lib/payload.js'
import { convertBlocksMarkdown } from '../../../_lib/markdown.js'

// Course-native landing blocks (rendered course-themed on courses.devince.dev,
// distinct from the main-site `layout` blocks). courseRichText.body markdown is
// auto-converted to Lexical via convertBlocksMarkdown; courseCallout.body is a
// plain textarea and passes through unchanged.
const VALID_BLOCK_TYPES = [
  'courseRichText',
  'courseVideo',
  'courseImage',
  'courseCallout',
] as const

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  const authError = validateAuth(request)
  if (authError) return authError

  let body: { landing?: unknown }
  try {
    body = (await request.json()) as { landing?: unknown }
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  try {
    const { idOrSlug } = await params
    const locale = parseLocale(request)
    if (isErrorResponse(locale)) return locale

    if (!Array.isArray(body.landing)) {
      return createErrorResponse('VALIDATION_ERROR', 'landing must be an array of block objects')
    }

    for (let i = 0; i < body.landing.length; i++) {
      const block = body.landing[i] as Record<string, unknown>
      if (!block || typeof block !== 'object' || typeof block.blockType !== 'string') {
        return createErrorResponse(
          'VALIDATION_ERROR',
          `landing[${i}]: each block must have a string blockType`,
        )
      }
      if (!(VALID_BLOCK_TYPES as readonly string[]).includes(block.blockType)) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          `landing[${i}]: invalid blockType "${block.blockType}". Allowed: ${VALID_BLOCK_TYPES.join(', ')}`,
        )
      }
    }

    const payload = await getPayloadClient()

    const [programId, landing] = await Promise.all([
      resolveDocId(payload, 'program', idOrSlug, locale),
      convertBlocksMarkdown(body.landing as Record<string, unknown>[]),
    ])
    if (isErrorResponse(programId)) return programId

    const program = await payload.update({
      collection: 'program',
      id: programId,
      data: { landing },
      locale,
      // API-key-authenticated server route, no Payload user session. Bypass
      // collection access explicitly so admin-only Program write access allows it.
      overrideAccess: true,
    })

    return createSuccessResponse({
      id: program.id,
      title: program.title,
      slug: program.slug ?? '',
      blocksCount: Array.isArray(program.landing) ? program.landing.length : 0,
    })
  } catch (error) {
    return handleRouteError('Set program landing', error)
  }
}
