import { NextRequest } from 'next/server'
import { validateAuth } from '../../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../../_lib/errors.js'
import { getPayloadClient } from '../../_lib/payload.js'
import { readOne } from '../../_lib/read.js'
import { parseVideo, VIDEO_LIMITS } from '../../_lib/videos.js'

type Args = { params: Promise<{ slug: string }> }

/** GET /api/external/videos/:slug — read back an exported film. */
export async function GET(request: NextRequest, { params }: Args) {
  const authError = validateAuth(request)
  if (authError) return authError
  const { slug } = await params
  try {
    return readOne(await getPayloadClient(), 'videos', slug, request)
  } catch (error) {
    return handleRouteError('Get video', error)
  }
}

/**
 * PUT /api/external/videos/:slug — idempotent upsert from the video pipeline.
 * The whole document is replaced, so a re-export after a fix is safe to repeat.
 * `productSlug` links the film's package (null unlinks it).
 */
export async function PUT(request: NextRequest, { params }: Args) {
  const authError = validateAuth(request)
  if (authError) return authError
  const { slug } = await params

  const raw = await request.text()
  if (raw.length > VIDEO_LIMITS.body) {
    return createErrorResponse(
      'VALIDATION_ERROR',
      `body must be at most ${VIDEO_LIMITS.body} chars`,
    )
  }
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }
  const video = parseVideo(slug, body)
  if (video instanceof Error) return createErrorResponse('VALIDATION_ERROR', video.message)

  try {
    const payload = await getPayloadClient()

    let product: number | null = null
    if (video.productSlug) {
      const found = await payload.find({
        collection: 'products',
        where: { slug: { equals: video.productSlug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (found.docs.length === 0) {
        return createErrorResponse('VALIDATION_ERROR', `product not found: ${video.productSlug}`)
      }
      product = found.docs[0]!.id
    }

    const { productSlug: _, ...fields } = video
    const data = { ...fields, product }

    const sameFilm = await payload.find({
      collection: 'videos',
      where: { youtubeId: { equals: video.youtubeId }, slug: { not_equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (sameFilm.docs[0]) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `youtubeId already exported as ${sameFilm.docs[0].slug}`,
      )
    }

    const existing = await payload.find({
      collection: 'videos',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const doc = existing.docs[0]
      ? await payload.update({
          collection: 'videos',
          id: existing.docs[0].id,
          data,
          overrideAccess: true,
        })
      : await payload.create({ collection: 'videos', data, overrideAccess: true })

    return createSuccessResponse(
      { id: doc.id, slug: doc.slug, created: !existing.docs[0], publishedAt: doc.publishedAt },
      existing.docs[0] ? 200 : 201,
    )
  } catch (error) {
    return handleRouteError('Upsert video', error)
  }
}
