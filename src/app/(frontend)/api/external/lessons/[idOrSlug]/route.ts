import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '../../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../../_lib/errors.js'
import {
  getPayloadClient,
  parseLocale,
  isErrorResponse,
  resolveContent,
  validateContentFormat,
} from '../../_lib/payload.js'
import { readOne } from '../../_lib/read.js'
import type { UpdateLessonRequest } from '../../_lib/types.js'

const VALID_KINDS = ['normal', 'decision'] as const
const VALID_TYPES = ['text', 'embed', 'video', 'download'] as const

export async function GET(request: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  const authError = validateAuth(request)
  if (authError) return authError
  try {
    const { idOrSlug } = await params
    const payload = await getPayloadClient()
    return readOne(payload, 'lessons', idOrSlug, request)
  } catch (error) {
    return handleRouteError('Read lesson', error)
  }
}

type ErrorResponse = NextResponse<{ error: { code: string; message: string } }>

/**
 * Resolve a lesson idOrSlug to a numeric lesson id.
 * Follows the same pattern as resolveDocId in _lib/payload.ts.
 * - Numeric string → findByID (404 on not-found).
 * - Other string  → find by slug (404 on empty results).
 */
async function resolveLessonId(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  idOrSlug: string,
  locale: 'pl' | 'en',
): Promise<number | ErrorResponse> {
  if (/^\d+$/.test(idOrSlug)) {
    const id = parseInt(idOrSlug, 10)
    try {
      await payload.findByID({
        collection: 'lessons',
        id,
        depth: 0,
        locale,
        overrideAccess: true,
        draft: true,
      })
    } catch (error) {
      if ((error as { status?: number }).status === 404) {
        return createErrorResponse('NOT_FOUND', `Lesson not found: ${idOrSlug}`)
      }
      throw error
    }
    return id
  }

  const found = await payload.find({
    collection: 'lessons',
    where: { slug: { equals: idOrSlug } },
    limit: 1,
    depth: 0,
    locale,
    overrideAccess: true,
    draft: true,
  })

  if (found.docs.length === 0) {
    return createErrorResponse('NOT_FOUND', `Lesson not found: ${idOrSlug}`)
  }

  return found.docs[0].id
}

/**
 * PATCH /api/external/lessons/[idOrSlug] — partially update a lesson.
 * Resolves by numeric id or slug. Bearer EXTERNAL_API_TOKEN.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  const authError = validateAuth(request)
  if (authError) return authError

  let body: UpdateLessonRequest
  try {
    body = (await request.json()) as UpdateLessonRequest
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  try {
    const { idOrSlug } = await params
    const locale = parseLocale(request)
    if (isErrorResponse(locale)) return locale

    const payload = await getPayloadClient()

    const lessonId = await resolveLessonId(payload, idOrSlug, locale)
    if (isErrorResponse(lessonId)) return lessonId

    // Validate enum fields before building data.
    if (body.kind !== undefined && !(VALID_KINDS as readonly string[]).includes(body.kind as string)) {
      return createErrorResponse('VALIDATION_ERROR', `kind must be one of: ${VALID_KINDS.join(', ')}`)
    }
    if (body.type !== undefined && !(VALID_TYPES as readonly string[]).includes(body.type as string)) {
      return createErrorResponse('VALIDATION_ERROR', `type must be one of: ${VALID_TYPES.join(', ')}`)
    }
    if (
      body.skills !== undefined &&
      (!Array.isArray(body.skills) || body.skills.some((s) => typeof s !== 'string'))
    ) {
      return createErrorResponse('VALIDATION_ERROR', 'skills must be an array of strings')
    }
    if (
      body.dependencies !== undefined &&
      (!Array.isArray(body.dependencies) || body.dependencies.some((d) => typeof d !== 'number'))
    ) {
      return createErrorResponse('VALIDATION_ERROR', 'dependencies must be an array of lesson ids')
    }

    const data: Record<string, unknown> = {}

    if (body.title !== undefined) data.title = body.title
    if (body._status !== undefined) data._status = body._status
    if (body.phase !== undefined) data.phase = body.phase
    if (body.order !== undefined) data.order = body.order
    if (body.nr !== undefined) data.nr = body.nr
    if (body.phaseId !== undefined) data.phaseId = body.phaseId
    if (body.hardGate !== undefined) data.hardGate = body.hardGate
    if (body.hybrid !== undefined) data.hybrid = body.hybrid
    if (body.kind !== undefined) data.kind = body.kind
    if (body.estTimeMin !== undefined) data.estTimeMin = body.estTimeMin
    if (body.why !== undefined) data.why = body.why
    if (body.what !== undefined) data.what = body.what
    if (body.dod !== undefined) data.dod = body.dod
    if (body.skills !== undefined) {
      data.skills = (body.skills as string[]).map((skill) => ({ skill }))
    }
    if (body.dependencies !== undefined) data.dependencies = body.dependencies
    if (body.type !== undefined) data.type = body.type
    if (body.youtubeEmbedUrl !== undefined) data.youtubeEmbedUrl = body.youtubeEmbedUrl
    if (body.slug !== undefined) data.slug = body.slug
    if (body.publishedAt !== undefined) data.publishedAt = body.publishedAt

    if (body.content !== undefined && body.content !== null) {
      const format = validateContentFormat(body.contentFormat)
      if (isErrorResponse(format)) return format
      const content = await resolveContent(
        body.content as string | Record<string, unknown>,
        format,
        'content',
      )
      if (isErrorResponse(content)) return content
      data.content = content
    }

    const lesson = await payload.update({
      collection: 'lessons',
      id: lessonId,
      data: data as never,
      locale,
      overrideAccess: true,
      ...(body._status !== undefined ? { draft: body._status === 'draft' } : {}),
    })

    return createSuccessResponse({
      id: lesson.id,
      title: lesson.title,
      slug: lesson.slug ?? null,
      nr: lesson.nr ?? null,
      phaseId: lesson.phaseId ?? null,
      _status: lesson._status ?? 'published',
    })
  } catch (error) {
    return handleRouteError('Update lesson', error)
  }
}

/**
 * DELETE /api/external/lessons/[idOrSlug] — delete a lesson.
 * Resolves by numeric id or slug. Bearer EXTERNAL_API_TOKEN.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  const authError = validateAuth(request)
  if (authError) return authError

  try {
    const { idOrSlug } = await params
    const locale = parseLocale(request)
    if (isErrorResponse(locale)) return locale

    const payload = await getPayloadClient()

    const lessonId = await resolveLessonId(payload, idOrSlug, locale)
    if (isErrorResponse(lessonId)) return lessonId

    await payload.delete({ collection: 'lessons', id: lessonId, overrideAccess: true })

    return NextResponse.json({ deleted: true, id: lessonId })
  } catch (error) {
    return handleRouteError('Delete lesson', error)
  }
}
