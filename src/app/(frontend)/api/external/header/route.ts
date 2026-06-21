import { NextRequest } from 'next/server'
import { validateAuth } from '../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../_lib/errors.js'
import { getPayloadClient, isErrorResponse, parseLocale } from '../_lib/payload.js'

/**
 * GET /api/external/header — read the main-site header navigation (the `header`
 * Payload global). `?locale=pl|en` (default pl) selects which language the
 * localized item labels are returned in. Bearer EXTERNAL_API_TOKEN.
 */
export async function GET(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError

  try {
    const locale = parseLocale(request)
    if (isErrorResponse(locale)) return locale

    const payload = await getPayloadClient()
    const header = await payload.findGlobal({
      slug: 'header',
      locale,
      depth: 0,
      overrideAccess: true,
    })
    return createSuccessResponse({ navItems: header?.navItems ?? [] }, 200)
  } catch (error) {
    return handleRouteError('Read header', error)
  }
}

/**
 * PATCH /api/external/header — replace the header nav items. Send the FULL
 * `navItems` array (each item: `{ link: { type:'custom', url, label } }` or a
 * `{ type:'reference', reference, label }`). `?locale=` writes that language's
 * labels. Bearer EXTERNAL_API_TOKEN.
 */
export async function PATCH(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError

  let body: { navItems?: unknown }
  try {
    body = (await request.json()) as { navItems?: unknown }
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  try {
    const locale = parseLocale(request)
    if (isErrorResponse(locale)) return locale

    if (!Array.isArray(body.navItems)) {
      return createErrorResponse('VALIDATION_ERROR', 'navItems must be an array')
    }

    const payload = await getPayloadClient()

    // navItems' `link.label` is LOCALIZED; the URL/type/target are shared. To
    // update one locale WITHOUT dropping the other locale's labels, the caller
    // carries each existing item's `id` (from a prior GET) — Payload then matches
    // array rows by id and only writes this language's label onto them. Items
    // sent WITHOUT an id are created fresh. So we pass navItems through as-is and
    // let Payload's native id-matching do the right thing; this also makes
    // reordering and mid-list inserts work (a position-based id rewrite would
    // mis-map them). Recipe: GET ?locale=pl -> edit -> PATCH ?locale=pl, then GET
    // ?locale=en -> edit -> PATCH ?locale=en (the second GET sees any new ids).
    const updated = await payload.updateGlobal({
      slug: 'header',
      data: { navItems: body.navItems } as never,
      locale,
      overrideAccess: true,
    })
    return createSuccessResponse({ navItems: updated?.navItems ?? [] }, 200)
  } catch (error) {
    return handleRouteError('Update header', error)
  }
}
