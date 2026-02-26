import { NextRequest } from 'next/server'
import { validateAuth } from '../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../_lib/errors.js'
import { resolveCategories } from '../_lib/categories.js'
import {
  getPayloadClient,
  parseLocale,
  validateContentFormat,
  resolveContent,
  isErrorResponse,
  toDocSummary,
} from '../_lib/payload.js'
import type { CreatePostRequest } from '../_lib/types.js'

export async function POST(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError

  let body: CreatePostRequest
  try {
    body = (await request.json()) as CreatePostRequest
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  try {
    const locale = parseLocale(request)
    if (isErrorResponse(locale)) return locale

    if (!body.title) {
      return createErrorResponse('VALIDATION_ERROR', 'title is required')
    }
    if (!body.content) {
      return createErrorResponse('VALIDATION_ERROR', 'content is required')
    }

    const contentFormat = validateContentFormat(body.contentFormat)
    if (isErrorResponse(contentFormat)) return contentFormat

    const content = await resolveContent(body.content, contentFormat, 'content')
    if (isErrorResponse(content)) return content

    const payload = await getPayloadClient()

    let categoryIds: number[] | undefined
    if (body.categories !== undefined) {
      if (
        !Array.isArray(body.categories) ||
        body.categories.some((cat) => typeof cat !== 'number' && typeof cat !== 'string')
      ) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'categories must be an array of numbers or strings',
        )
      }
      categoryIds = body.categories.length
        ? await resolveCategories(payload, body.categories)
        : []
    }

    const data: Record<string, unknown> = {
      title: body.title,
      content,
      _status: body._status ?? 'draft',
      ...(body.heroImage && { heroImage: body.heroImage }),
      ...(categoryIds && { categories: categoryIds }),
      ...(body.meta && { meta: body.meta }),
      ...(body.publishedAt && { publishedAt: body.publishedAt }),
      ...(body.authors && { authors: body.authors }),
    }

    const post = await payload.create({
      collection: 'posts',
      data: data as never,
      locale,
      draft: data._status === 'draft',
    })

    return createSuccessResponse(toDocSummary(post), 201)
  } catch (error) {
    return handleRouteError('Create post', error)
  }
}
