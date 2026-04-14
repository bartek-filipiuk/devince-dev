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

const VALID_BLOCK_TYPES = [
  'glassHero',
  'features',
  'testimonials',
  'contactCTA',
  'brevoSignup',
  'cta',
  'content',
  'mediaBlock',
  'archive',
  'formBlock',
] as const

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  const authError = validateAuth(request)
  if (authError) return authError

  let body: { layout?: unknown }
  try {
    body = (await request.json()) as { layout?: unknown }
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  try {
    const { idOrSlug } = await params
    const locale = parseLocale(request)
    if (isErrorResponse(locale)) return locale

    if (!Array.isArray(body.layout)) {
      return createErrorResponse('VALIDATION_ERROR', 'layout must be an array of block objects')
    }

    for (let i = 0; i < body.layout.length; i++) {
      const block = body.layout[i] as Record<string, unknown>
      if (!block || typeof block !== 'object' || typeof block.blockType !== 'string') {
        return createErrorResponse(
          'VALIDATION_ERROR',
          `layout[${i}]: each block must have a string blockType`,
        )
      }
      if (!(VALID_BLOCK_TYPES as readonly string[]).includes(block.blockType)) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          `layout[${i}]: invalid blockType "${block.blockType}". Allowed: ${VALID_BLOCK_TYPES.join(', ')}`,
        )
      }
    }

    const payload = await getPayloadClient()

    const [programId, layout] = await Promise.all([
      resolveDocId(payload, 'program', idOrSlug, locale),
      convertBlocksMarkdown(body.layout as Record<string, unknown>[]),
    ])
    if (isErrorResponse(programId)) return programId

    const program = await payload.update({
      collection: 'program',
      id: programId,
      data: { layout },
      locale,
    })

    return createSuccessResponse({
      id: program.id,
      title: program.title,
      slug: program.slug ?? '',
      blocksCount: Array.isArray(program.layout) ? program.layout.length : 0,
    })
  } catch (error) {
    return handleRouteError('Set program layout', error)
  }
}
