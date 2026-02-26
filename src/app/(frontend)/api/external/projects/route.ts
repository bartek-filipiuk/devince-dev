import { NextRequest } from 'next/server'
import { validateAuth } from '../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../_lib/errors.js'
import {
  getPayloadClient,
  parseLocale,
  resolveContent,
  isErrorResponse,
  toDocSummary,
} from '../_lib/payload.js'
import type { CreateProjectRequest } from '../_lib/types.js'

export async function POST(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError

  let body: CreateProjectRequest
  try {
    body = (await request.json()) as CreateProjectRequest
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  try {
    const locale = parseLocale(request)

    if (!body.title) {
      return createErrorResponse('VALIDATION_ERROR', 'title is required')
    }
    if (!body.description) {
      return createErrorResponse('VALIDATION_ERROR', 'description is required')
    }

    const description = await resolveContent(
      body.description,
      body.contentFormat ?? 'markdown',
      'description',
    )
    if (isErrorResponse(description)) return description

    const payload = await getPayloadClient()

    const data: Record<string, unknown> = {
      title: body.title,
      description,
      _status: body._status ?? 'draft',
      ...(body.heroImage && { heroImage: body.heroImage }),
      ...(body.meta && { meta: body.meta }),
      ...(body.publishedAt && { publishedAt: body.publishedAt }),
      ...(body.githubUrl && { githubUrl: body.githubUrl }),
      ...(body.productionUrl && { productionUrl: body.productionUrl }),
      ...(body.technologies?.length && {
        technologies: body.technologies.map((name) => ({ name })),
      }),
    }

    const project = await payload.create({
      collection: 'projects',
      data: data as never,
      locale,
      draft: data._status === 'draft',
    })

    return createSuccessResponse(toDocSummary(project), 201)
  } catch (error) {
    return handleRouteError('Create project', error)
  }
}
