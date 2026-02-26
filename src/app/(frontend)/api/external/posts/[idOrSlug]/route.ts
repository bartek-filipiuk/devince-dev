import { NextRequest } from 'next/server'
import { validateAuth } from '../../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../../_lib/errors.js'
import { resolveCategories } from '../../_lib/categories.js'
import {
  getPayloadClient,
  parseLocale,
  resolveContent,
  resolveDocId,
  isErrorResponse,
  toDocSummary,
} from '../../_lib/payload.js'
import type { CreatePostRequest } from '../../_lib/types.js'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  const authError = validateAuth(request)
  if (authError) return authError

  let body: Partial<CreatePostRequest>
  try {
    body = (await request.json()) as Partial<CreatePostRequest>
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  try {
    const { idOrSlug } = await params
    const locale = parseLocale(request)

    const payload = await getPayloadClient()

    const postId = await resolveDocId(payload, 'posts', idOrSlug, locale)
    if (isErrorResponse(postId)) return postId

    const data: Record<string, unknown> = {}

    if (body.title !== undefined) data.title = body.title
    if (body.heroImage !== undefined) data.heroImage = body.heroImage
    if (body.meta !== undefined) data.meta = body.meta
    if (body.publishedAt !== undefined) data.publishedAt = body.publishedAt
    if (body.authors !== undefined) data.authors = body.authors
    if (body._status !== undefined) data._status = body._status

    if (body.content !== undefined) {
      const content = await resolveContent(
        body.content,
        body.contentFormat ?? 'markdown',
        'content',
      )
      if (isErrorResponse(content)) return content
      data.content = content
    }

    if (body.categories !== undefined) {
      data.categories = body.categories.length
        ? await resolveCategories(payload, body.categories)
        : []
    }

    const post = await payload.update({
      collection: 'posts',
      id: postId,
      data,
      locale,
      draft: data._status === 'draft',
    })

    return createSuccessResponse(toDocSummary(post))
  } catch (error) {
    return handleRouteError('Update post', error)
  }
}
