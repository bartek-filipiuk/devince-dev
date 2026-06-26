import { NextRequest } from 'next/server'
import { validateAuth } from '../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../_lib/errors.js'
import {
  getPayloadClient,
  isErrorResponse,
  resolveContent,
  resolveDocId,
  validateContentFormat,
} from '../_lib/payload.js'
import { readList } from '../_lib/read.js'

const VALID_KINDS = ['normal', 'decision'] as const
const VALID_TYPES = ['text', 'embed', 'video', 'download'] as const

export async function GET(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError
  try {
    const payload = await getPayloadClient()
    return readList(payload, 'lessons', request)
  } catch (error) {
    return handleRouteError('List lessons', error)
  }
}

type CreateLessonRequest = {
  title?: unknown
  program?: unknown // id (number) or slug (string)
  phase?: unknown
  order?: unknown
  nr?: unknown
  phaseId?: unknown
  hardGate?: unknown
  hybrid?: unknown
  kind?: unknown
  estTimeMin?: { min?: number; max?: number }
  why?: unknown
  what?: unknown
  dod?: unknown
  skills?: unknown // string[]
  dependencies?: unknown // number[] of lesson ids
  type?: unknown
  content?: unknown
  contentFormat?: string
  youtubeEmbedUrl?: unknown
  slug?: unknown
  publishedAt?: unknown
  _status?: unknown
}

/**
 * POST /api/external/lessons — create a course lesson. `program` is an id or
 * slug. Lessons default to published so enrolled users can see them.
 * Bearer EXTERNAL_API_TOKEN.
 */
export async function POST(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError

  let body: CreateLessonRequest
  try {
    body = (await request.json()) as CreateLessonRequest
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  try {
    if (!body.title || typeof body.title !== 'string') {
      return createErrorResponse('VALIDATION_ERROR', 'title is required')
    }
    if (body.program === undefined || (typeof body.program !== 'number' && typeof body.program !== 'string')) {
      return createErrorResponse('VALIDATION_ERROR', 'program (id or slug) is required')
    }
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

    const payload = await getPayloadClient()

    const programId = await resolveDocId(payload, 'program', String(body.program), 'pl')
    if (isErrorResponse(programId)) return programId

    const status = body._status === 'draft' ? 'draft' : 'published'

    const data: Record<string, unknown> = {
      title: body.title,
      program: programId,
      _status: status,
      ...(typeof body.phase === 'string' && { phase: body.phase }),
      ...(typeof body.order === 'number' && { order: body.order }),
      ...(typeof body.nr === 'number' && { nr: body.nr }),
      ...(typeof body.phaseId === 'string' && { phaseId: body.phaseId }),
      ...(typeof body.hardGate === 'boolean' && { hardGate: body.hardGate }),
      ...(typeof body.hybrid === 'boolean' && { hybrid: body.hybrid }),
      ...(typeof body.kind === 'string' && { kind: body.kind }),
      ...(body.estTimeMin && typeof body.estTimeMin === 'object' && { estTimeMin: body.estTimeMin }),
      ...(typeof body.why === 'string' && { why: body.why }),
      ...(typeof body.what === 'string' && { what: body.what }),
      ...(typeof body.dod === 'string' && { dod: body.dod }),
      ...(Array.isArray(body.skills) && { skills: (body.skills as string[]).map((skill) => ({ skill })) }),
      ...(Array.isArray(body.dependencies) && { dependencies: body.dependencies }),
      ...(typeof body.type === 'string' && { type: body.type }),
      ...(typeof body.youtubeEmbedUrl === 'string' && { youtubeEmbedUrl: body.youtubeEmbedUrl }),
      ...(typeof body.slug === 'string' && { slug: body.slug }),
      ...(typeof body.publishedAt === 'string' && { publishedAt: body.publishedAt }),
    }

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

    const lesson = await payload.create({
      collection: 'lessons',
      data: data as never,
      draft: status === 'draft',
    })

    return createSuccessResponse(
      {
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug ?? null,
        nr: lesson.nr ?? null,
        phaseId: lesson.phaseId ?? null,
        _status: lesson._status ?? 'published',
      },
      201,
    )
  } catch (error) {
    return handleRouteError('Create lesson', error)
  }
}
