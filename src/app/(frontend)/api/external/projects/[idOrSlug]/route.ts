import { NextRequest } from 'next/server'
import { validateAuth } from '../../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../../_lib/errors.js'
import {
  getPayloadClient,
  parseLocale,
  validateContentFormat,
  resolveContent,
  resolveDocId,
  isErrorResponse,
  toDocSummary,
  validateUrl,
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
    if (isErrorResponse(locale)) return locale

    const payload = await getPayloadClient()

    const projectId = await resolveDocId(payload, 'projects', idOrSlug, locale)
    if (isErrorResponse(projectId)) return projectId

    const data: Record<string, unknown> = {}

    if (body.title !== undefined) data.title = body.title
    if (body._status !== undefined) data._status = body._status
    if (body.heroImage !== undefined) data.heroImage = body.heroImage
    if (body.meta !== undefined) data.meta = body.meta
    if (body.publishedAt !== undefined) data.publishedAt = body.publishedAt

    if (body.githubUrl !== undefined) {
      const urlError = validateUrl(body.githubUrl, 'githubUrl')
      if (urlError) return urlError
      data.githubUrl = body.githubUrl
    }
    if (body.productionUrl !== undefined) {
      const urlError = validateUrl(body.productionUrl, 'productionUrl')
      if (urlError) return urlError
      data.productionUrl = body.productionUrl
    }

    if (body.description !== undefined) {
      const contentFormat = validateContentFormat(body.contentFormat)
      if (isErrorResponse(contentFormat)) return contentFormat

      const description = await resolveContent(body.description, contentFormat, 'description')
      if (isErrorResponse(description)) return description
      data.description = description
    }

    if (body.technologies !== undefined) {
      if (
        !Array.isArray(body.technologies) ||
        body.technologies.some((t) => typeof t !== 'string')
      ) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'technologies must be an array of strings',
        )
      }
      data.technologies = body.technologies.map((name) => ({ name }))
    }

    const project = await payload.update({
      collection: 'projects',
      id: projectId,
      data,
      locale,
      ...(body._status !== undefined ? { draft: body._status === 'draft' } : {}),
    })

    return createSuccessResponse(toDocSummary(project))
  } catch (error) {
    return handleRouteError('Update project', error)
  }
}
