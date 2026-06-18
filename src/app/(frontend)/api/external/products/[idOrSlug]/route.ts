import { NextRequest } from 'next/server'
import { validateAuth } from '../../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../../_lib/errors.js'
import {
  getPayloadClient,
  isErrorResponse,
  resolveContent,
  resolveDocId,
  validateContentFormat,
} from '../../_lib/payload.js'

const VALID_CURRENCIES = ['pln', 'eur', 'usd'] as const

type UpdateProductRequest = {
  title?: unknown
  slug?: unknown
  description?: unknown
  contentFormat?: string
  priceCents?: unknown
  currency?: unknown
  stripePriceId?: unknown
  downloadFiles?: unknown
  coverImage?: unknown
  _status?: unknown
}

/**
 * PATCH /api/external/products/:idOrSlug — update a product. Only the provided
 * fields change. Useful to repoint `downloadFiles` to a freshly uploaded
 * app-asset, change price/currency, or publish. Bearer EXTERNAL_API_TOKEN.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  const authError = validateAuth(request)
  if (authError) return authError

  let body: UpdateProductRequest
  try {
    body = (await request.json()) as UpdateProductRequest
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  try {
    const { idOrSlug } = await params
    const payload = await getPayloadClient()

    // products' main fields are not localized; pass 'pl' to satisfy the helper.
    const productId = await resolveDocId(payload, 'products', idOrSlug, 'pl')
    if (isErrorResponse(productId)) return productId

    const data: Record<string, unknown> = {}

    if (body.title !== undefined) {
      if (typeof body.title !== 'string') {
        return createErrorResponse('VALIDATION_ERROR', 'title must be a string')
      }
      data.title = body.title
    }
    if (body.slug !== undefined) {
      if (typeof body.slug !== 'string') {
        return createErrorResponse('VALIDATION_ERROR', 'slug must be a string')
      }
      data.slug = body.slug
    }
    if (body.priceCents !== undefined) {
      if (typeof body.priceCents !== 'number' || !Number.isInteger(body.priceCents) || body.priceCents < 0) {
        return createErrorResponse('VALIDATION_ERROR', 'priceCents must be a non-negative integer')
      }
      data.priceCents = body.priceCents
    }
    if (body.currency !== undefined) {
      if (typeof body.currency !== 'string' || !(VALID_CURRENCIES as readonly string[]).includes(body.currency)) {
        return createErrorResponse('VALIDATION_ERROR', `currency must be one of: ${VALID_CURRENCIES.join(', ')}`)
      }
      data.currency = body.currency
    }
    if (body.stripePriceId !== undefined) {
      if (body.stripePriceId !== null && typeof body.stripePriceId !== 'string') {
        return createErrorResponse('VALIDATION_ERROR', 'stripePriceId must be a string or null')
      }
      data.stripePriceId = body.stripePriceId
    }
    if (body.downloadFiles !== undefined) {
      if (!Array.isArray(body.downloadFiles) || body.downloadFiles.some((x) => typeof x !== 'number')) {
        return createErrorResponse('VALIDATION_ERROR', 'downloadFiles must be an array of numeric app-asset ids')
      }
      data.downloadFiles = body.downloadFiles
    }
    if (body.coverImage !== undefined) {
      if (body.coverImage !== null && typeof body.coverImage !== 'number') {
        return createErrorResponse('VALIDATION_ERROR', 'coverImage must be a media id or null')
      }
      data.coverImage = body.coverImage
    }
    if (body._status !== undefined) {
      if (body._status !== 'draft' && body._status !== 'published') {
        return createErrorResponse('VALIDATION_ERROR', '_status must be "draft" or "published"')
      }
      data._status = body._status
    }
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

    if (Object.keys(data).length === 0) {
      return createErrorResponse('VALIDATION_ERROR', 'No updatable fields provided')
    }

    // Always write to the main document (draft: false) so `_status` actually
    // toggles publish state. Passing draft:true here would save a draft version
    // BESIDE the still-published one — i.e. `_status:'draft'` would NOT
    // unpublish, leaving the product live + purchasable. `_status` in `data`
    // governs whether the saved main doc is published or unpublished.
    const product = await payload.update({
      collection: 'products',
      id: productId,
      data: data as never,
      draft: false,
    })

    return createSuccessResponse(
      {
        id: product.id,
        title: product.title,
        slug: product.slug ?? null,
        priceCents: product.priceCents,
        currency: product.currency,
        _status: product._status ?? 'draft',
        downloadFiles: Array.isArray(product.downloadFiles)
          ? product.downloadFiles.map((f) => (typeof f === 'object' && f ? f.id : f))
          : product.downloadFiles ?? null,
      },
      200,
    )
  } catch (error) {
    return handleRouteError('Update product', error)
  }
}

/**
 * DELETE /api/external/products/:idOrSlug — hard-delete a product. Removes the
 * product's download-grants first (relationship rows would otherwise dangle at
 * a deleted product / block the delete via FK). Does NOT delete the linked
 * app-asset files — those are a separate collection and may be shared.
 * Bearer EXTERNAL_API_TOKEN.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  const authError = validateAuth(request)
  if (authError) return authError

  try {
    const { idOrSlug } = await params
    const payload = await getPayloadClient()

    // products' main fields are not localized; pass 'pl' to satisfy the helper.
    const productId = await resolveDocId(payload, 'products', idOrSlug, 'pl')
    if (isErrorResponse(productId)) return productId

    // Remove dependent purchase-fulfillment grants first — they are meaningless
    // once the product is gone and a referencing row would otherwise block the
    // delete (or dangle).
    const removedGrants = await payload.delete({
      collection: 'download-grants',
      where: { product: { equals: productId } },
    })
    const grantsRemoved = Array.isArray(removedGrants?.docs) ? removedGrants.docs.length : 0

    await payload.delete({ collection: 'products', id: productId })

    return createSuccessResponse({ id: productId, deleted: true, grantsRemoved }, 200)
  } catch (error) {
    return handleRouteError('Delete product', error)
  }
}
