import { NextRequest } from 'next/server'
import { validateAuth } from '../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../_lib/errors.js'
import {
  getPayloadClient,
  parseLocale,
  isErrorResponse,
  toDocSummary,
  validateUrl,
} from '../_lib/payload.js'
import { readList } from '../_lib/read.js'
import type { CreateProgramRequest } from '../_lib/types.js'

const VALID_TYPES = ['course', 'workshop', 'event'] as const
const VALID_FORMATS = ['online', 'physical', 'hybrid'] as const
const VALID_PRICING = ['free', 'paid'] as const
const VALID_ACCESS_MODES = ['paid', 'lead-magnet'] as const

export async function GET(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError
  try {
    const payload = await getPayloadClient()
    return readList(payload, 'program', request)
  } catch (error) {
    return handleRouteError('List programs', error)
  }
}

export async function POST(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError

  let body: CreateProgramRequest
  try {
    body = (await request.json()) as CreateProgramRequest
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  try {
    const locale = parseLocale(request)
    if (isErrorResponse(locale)) return locale

    if (!body.title) {
      return createErrorResponse('VALIDATION_ERROR', 'title is required')
    }
    if (!body.type || !(VALID_TYPES as readonly string[]).includes(body.type)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `type is required and must be one of: ${VALID_TYPES.join(', ')}`,
      )
    }
    if (body.format && !(VALID_FORMATS as readonly string[]).includes(body.format)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `format must be one of: ${VALID_FORMATS.join(', ')}`,
      )
    }
    if (body.pricing && !(VALID_PRICING as readonly string[]).includes(body.pricing)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `pricing must be one of: ${VALID_PRICING.join(', ')}`,
      )
    }
    if (body.accessMode && !(VALID_ACCESS_MODES as readonly string[]).includes(body.accessMode)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `accessMode must be one of: ${VALID_ACCESS_MODES.join(', ')}`,
      )
    }

    if (body.ctaUrl) {
      const urlError = validateUrl(body.ctaUrl, 'ctaUrl')
      if (urlError) return urlError
    }
    if (body.onlineLink) {
      const urlError = validateUrl(body.onlineLink, 'onlineLink')
      if (urlError) return urlError
    }

    const payload = await getPayloadClient()

    const data: Record<string, unknown> = {
      title: body.title,
      type: body.type,
      _status: body._status ?? 'draft',
      ...(body.heroImage && { heroImage: body.heroImage }),
      ...(body.heroHeadline && { heroHeadline: body.heroHeadline }),
      ...(body.heroDescription && { heroDescription: body.heroDescription }),
      ...(body.startDate && { startDate: body.startDate }),
      ...(body.endDate && { endDate: body.endDate }),
      ...(body.format && { format: body.format }),
      ...(body.onlineLink && { onlineLink: body.onlineLink }),
      ...(body.locationName && { locationName: body.locationName }),
      ...(body.locationAddress && { locationAddress: body.locationAddress }),
      ...(body.pricing && { pricing: body.pricing }),
      ...(body.priceCents !== undefined && { priceCents: body.priceCents }),
      ...(body.currency && { currency: body.currency }),
      ...(body.stripePaymentLink && { stripePaymentLink: body.stripePaymentLink }),
      ...(body.stripePriceId && { stripePriceId: body.stripePriceId }),
      ...(body.duration && { duration: body.duration }),
      ...(body.ctaLabel && { ctaLabel: body.ctaLabel }),
      ...(body.ctaUrl && { ctaUrl: body.ctaUrl }),
      ...(body.meta && { meta: body.meta }),
      ...(body.publishedAt && { publishedAt: body.publishedAt }),
      // Sylabus tab. audience/requirements: string[] -> [{ item }].
      ...(Array.isArray(body.phases) && { phases: body.phases }),
      ...(Array.isArray(body.outcomes) && { outcomes: body.outcomes }),
      ...(Array.isArray(body.audience) && { audience: body.audience.map((item) => ({ item })) }),
      ...(Array.isArray(body.requirements) && {
        requirements: body.requirements.map((item) => ({ item })),
      }),
      ...(body.level && { level: body.level }),
      ...(body.accessMode !== undefined && { accessMode: body.accessMode }),
      ...(body.featured !== undefined && { featured: body.featured }),
    }

    const program = await payload.create({
      collection: 'program',
      data: data as never,
      locale,
      draft: data._status === 'draft',
      // This route is API-key-authenticated (validateAuth above) and runs
      // server-side with no Payload user session. Bypass collection access
      // explicitly so the admin-only Program write access does not block it.
      overrideAccess: true,
    })

    return createSuccessResponse(toDocSummary(program), 201)
  } catch (error) {
    return handleRouteError('Create program', error)
  }
}
