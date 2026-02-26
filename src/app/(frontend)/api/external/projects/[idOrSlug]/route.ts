import { NextRequest } from 'next/server'
import { validateAuth } from '../../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../../_lib/errors.js'
import {
  getPayloadClient,
  parseLocale,
  resolveContent,
  resolveDocId,
  isErrorResponse,
  toDocSummary,
} from '../../_lib/payload.js'
import type { CreateProjectRequest } from '../../_lib/types.js'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  const authError = validateAuth(request)
  if (authError) return authError

  let body: Partial<CreateProjectRequest>
  try {
    body = (await request.json()) as Partial<CreateProjectRequest>
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  try {
    const { idOrSlug } = await params
    const locale = parseLocale(request)

    const payload = await getPayloadClient()

    const projectId = await resolveDocId(payload, 'projects', idOrSlug, locale)
    if (isErrorResponse(projectId)) return projectId

    const data: Record<string, unknown> = {}

    if (body.title !== undefined) data.title = body.title
    if (body._status !== undefined) data._status = body._status
    if (body.heroImage !== undefined) data.heroImage = body.heroImage
    if (body.meta !== undefined) data.meta = body.meta
    if (body.publishedAt !== undefined) data.publishedAt = body.publishedAt
    if (body.githubUrl !== undefined) data.githubUrl = body.githubUrl
    if (body.productionUrl !== undefined) data.productionUrl = body.productionUrl

    if (body.description !== undefined) {
      const description = await resolveContent(
        body.description,
        body.contentFormat ?? 'markdown',
        'description',
      )
      if (isErrorResponse(description)) return description
      data.description = description
    }

    if (body.technologies !== undefined) {
      data.technologies = Array.isArray(body.technologies)
        ? body.technologies.map((name) => ({ name }))
        : []
    }

    const project = await payload.update({
      collection: 'projects',
      id: projectId,
      data,
      locale,
      draft: data._status === 'draft',
    })

    return createSuccessResponse(toDocSummary(project))
  } catch (error) {
    return handleRouteError('Update project', error)
  }
}
