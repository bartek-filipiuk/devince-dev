import { NextRequest } from 'next/server'
import { validateAuth } from '../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../_lib/errors.js'
import {
  getPayloadClient,
  isErrorResponse,
  resolveContent,
  validateContentFormat,
} from '../_lib/payload.js'
import { readList } from '../_lib/read.js'

import type { CreateProductRequest } from '../_lib/types.js'

const VALID_CURRENCIES = ['pln', 'eur', 'usd'] as const
const VALID_ACCESS_MODES = ['paid', 'lead-magnet'] as const

export async function GET(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError
  try {
    const payload = await getPayloadClient()
    return readList(payload, 'products', request)
  } catch (error) {
    return handleRouteError('List products', error)
  }
}

/**
 * POST /api/external/products — create a downloadable apps-store product.
 *
 * Auth: Bearer EXTERNAL_API_TOKEN. Body (JSON):
 *   title (req), priceCents (req, integer grosze/cents), currency (pln|eur|usd,
 *   default pln), description (optional markdown -> richText), downloadFiles
 *   (array of app-asset ids from /api/external/app-assets), stripePriceId,
 *   coverImage (media id), slug, _status (draft|published, default draft).
 */
export async function POST(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError

  let body: CreateProductRequest
  try {
    body = (await request.json()) as CreateProductRequest
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  try {
    if (!body.title || typeof body.title !== 'string') {
      return createErrorResponse('VALIDATION_ERROR', 'title is required')
    }
    if (typeof body.priceCents !== 'number' || !Number.isInteger(body.priceCents) || body.priceCents < 0) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'priceCents is required and must be a non-negative integer',
      )
    }
    const currency = body.currency ?? 'pln'
    if (typeof currency !== 'string' || !(VALID_CURRENCIES as readonly string[]).includes(currency)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `currency must be one of: ${VALID_CURRENCIES.join(', ')}`,
      )
    }
    if (
      body.downloadFiles !== undefined &&
      (!Array.isArray(body.downloadFiles) || body.downloadFiles.some((x) => typeof x !== 'number'))
    ) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'downloadFiles must be an array of numeric app-asset ids',
      )
    }
    if (body.slug !== undefined && typeof body.slug !== 'string') {
      return createErrorResponse('VALIDATION_ERROR', 'slug must be a string')
    }
    if (body.stripePriceId !== undefined && typeof body.stripePriceId !== 'string') {
      return createErrorResponse('VALIDATION_ERROR', 'stripePriceId must be a string')
    }
    if (body.accessMode !== undefined && !(VALID_ACCESS_MODES as readonly string[]).includes(body.accessMode)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `accessMode must be one of: ${VALID_ACCESS_MODES.join(', ')}`,
      )
    }

    const status = body._status === 'published' ? 'published' : 'draft'

    const data: Record<string, unknown> = {
      title: body.title,
      priceCents: body.priceCents,
      currency,
      _status: status,
      ...(typeof body.slug === 'string' && { slug: body.slug }),
      ...(typeof body.stripePriceId === 'string' && { stripePriceId: body.stripePriceId }),
      ...(Array.isArray(body.downloadFiles) && { downloadFiles: body.downloadFiles }),
      ...(typeof body.coverImage === 'number' && { coverImage: body.coverImage }),
      ...(body.accessMode !== undefined && { accessMode: body.accessMode }),
    }

    // Optional richText description: markdown (default) or lexical object.
    if (body.description !== undefined && body.description !== null) {
      const format = validateContentFormat(body.contentFormat)
      if (isErrorResponse(format)) return format
      const content = await resolveContent(
        body.description as string | Record<string, unknown>,
        format,
        'description',
      )
      if (isErrorResponse(content)) return content
      data.description = content
    }

    const payload = await getPayloadClient()
    const product = await payload.create({
      collection: 'products',
      data: data as never,
      draft: status === 'draft',
    })

    return createSuccessResponse(
      {
        id: product.id,
        title: product.title,
        slug: product.slug ?? null,
        priceCents: product.priceCents,
        currency: product.currency,
        _status: product._status ?? 'draft',
      },
      201,
    )
  } catch (error) {
    return handleRouteError('Create product', error)
  }
}
