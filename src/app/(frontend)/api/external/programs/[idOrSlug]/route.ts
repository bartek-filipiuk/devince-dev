import { NextRequest } from 'next/server'
import { validateAuth } from '../../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../../_lib/errors.js'
import {
  getPayloadClient,
  parseLocale,
  resolveDocId,
  isErrorResponse,
  toDocSummary,
  validateUrl,
} from '../../_lib/payload.js'
import type { CreateProgramRequest } from '../../_lib/types.js'

const VALID_TYPES = ['course', 'workshop', 'event'] as const
const VALID_FORMATS = ['online', 'physical', 'hybrid'] as const
const VALID_PRICING = ['free', 'paid'] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  const authError = validateAuth(request)
  if (authError) return authError

  let body: Partial<CreateProgramRequest>
  try {
    body = (await request.json()) as Partial<CreateProgramRequest>
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  try {
    const { idOrSlug } = await params
    const locale = parseLocale(request)
    if (isErrorResponse(locale)) return locale

    const payload = await getPayloadClient()

    const programId = await resolveDocId(payload, 'program', idOrSlug, locale)
    if (isErrorResponse(programId)) return programId

    const data: Record<string, unknown> = {}

    if (body.title !== undefined) data.title = body.title
    if (body._status !== undefined) data._status = body._status
    if (body.heroImage !== undefined) data.heroImage = body.heroImage
    if (body.meta !== undefined) data.meta = body.meta
    if (body.publishedAt !== undefined) data.publishedAt = body.publishedAt
    if (body.heroHeadline !== undefined) data.heroHeadline = body.heroHeadline
    if (body.heroDescription !== undefined) data.heroDescription = body.heroDescription
    if (body.startDate !== undefined) data.startDate = body.startDate
    if (body.endDate !== undefined) data.endDate = body.endDate
    if (body.locationName !== undefined) data.locationName = body.locationName
    if (body.locationAddress !== undefined) data.locationAddress = body.locationAddress
    if (body.duration !== undefined) data.duration = body.duration
    if (body.ctaLabel !== undefined) data.ctaLabel = body.ctaLabel

    if (body.type !== undefined) {
      if (!(VALID_TYPES as readonly string[]).includes(body.type)) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          `type must be one of: ${VALID_TYPES.join(', ')}`,
        )
      }
      data.type = body.type
    }
    if (body.format !== undefined) {
      if (!(VALID_FORMATS as readonly string[]).includes(body.format)) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          `format must be one of: ${VALID_FORMATS.join(', ')}`,
        )
      }
      data.format = body.format
    }
    if (body.pricing !== undefined) {
      if (!(VALID_PRICING as readonly string[]).includes(body.pricing)) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          `pricing must be one of: ${VALID_PRICING.join(', ')}`,
        )
      }
      data.pricing = body.pricing
    }

    if (body.ctaUrl !== undefined) {
      const urlError = validateUrl(body.ctaUrl, 'ctaUrl')
      if (urlError) return urlError
      data.ctaUrl = body.ctaUrl
    }
    if (body.onlineLink !== undefined) {
      const urlError = validateUrl(body.onlineLink, 'onlineLink')
      if (urlError) return urlError
      data.onlineLink = body.onlineLink
    }

    const program = await payload.update({
      collection: 'program',
      id: programId,
      data,
      locale,
      ...(body._status !== undefined ? { draft: body._status === 'draft' } : {}),
    })

    return createSuccessResponse(toDocSummary(program))
  } catch (error) {
    return handleRouteError('Update program', error)
  }
}
