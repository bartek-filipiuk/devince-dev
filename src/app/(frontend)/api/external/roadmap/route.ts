import { NextRequest } from 'next/server'
import { validateAuth } from '../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../_lib/errors.js'
import { getPayloadClient, isErrorResponse, parseLocale } from '../_lib/payload.js'

/**
 * GET /api/external/roadmap — read the public roadmap (the `roadmap` Payload
 * global). `?locale=pl|en` (default pl) selects which language the localized item
 * `title`/`description` are returned in. Bearer EXTERNAL_API_TOKEN.
 */
export async function GET(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError

  try {
    const locale = parseLocale(request)
    if (isErrorResponse(locale)) return locale

    const payload = await getPayloadClient()
    const roadmap = await payload.findGlobal({
      slug: 'roadmap',
      locale,
      depth: 0,
      overrideAccess: true,
    })
    return createSuccessResponse({ items: roadmap?.items ?? [] }, 200)
  } catch (error) {
    return handleRouteError('Read roadmap', error)
  }
}

/**
 * PATCH /api/external/roadmap — replace the roadmap items. Send the FULL `items`
 * array (each item: `{ title, description?, status: 'planned'|'in_progress'|'done',
 * track: 'general'|'apps'|'courses' }`). `?locale=` writes that language's
 * `title`/`description`.
 *
 * `title`/`description` are LOCALIZED; `status`/`track` are shared. To update one
 * locale WITHOUT dropping the other locale's text, the caller carries each existing
 * item's `id` (from a prior GET/PATCH response) — Payload then matches array rows
 * by id and only writes this language's text onto them. Items sent WITHOUT an id are
 * created fresh. So we pass items through as-is and let Payload's native id-matching
 * do the right thing (this also makes reorders and mid-list inserts work). Recipe:
 * PATCH ?locale=pl (no ids -> created, response carries ids) -> PATCH ?locale=en with
 * those ids. Bearer EXTERNAL_API_TOKEN.
 */
export async function PATCH(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError

  let body: { items?: unknown }
  try {
    body = (await request.json()) as { items?: unknown }
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  try {
    const locale = parseLocale(request)
    if (isErrorResponse(locale)) return locale

    if (!Array.isArray(body.items)) {
      return createErrorResponse('VALIDATION_ERROR', 'items must be an array')
    }

    const payload = await getPayloadClient()
    const updated = await payload.updateGlobal({
      slug: 'roadmap',
      data: { items: body.items } as never,
      locale,
      overrideAccess: true,
    })
    return createSuccessResponse({ items: updated?.items ?? [] }, 200)
  } catch (error) {
    return handleRouteError('Update roadmap', error)
  }
}
