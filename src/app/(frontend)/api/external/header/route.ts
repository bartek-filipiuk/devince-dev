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

    // navItems is an array whose `link.label` is LOCALIZED; the URL/type/target
    // are shared. Writing the array at one locale WITHOUT each row's id makes
    // Payload replace it and drop the OTHER locale's labels. Carry the existing
    // rows' ids forward BY POSITION so a per-locale write only updates this
    // language's labels on the shared rows (same approach as product tiers).
    const existing = await payload.findGlobal({
      slug: 'header',
      locale,
      depth: 0,
      overrideAccess: true,
    })
    const existingItems = Array.isArray(existing?.navItems) ? existing.navItems : []
    const navItems = body.navItems.map((item, i) => {
      const prev = existingItems[i]
      const prevId = prev && typeof prev === 'object' ? (prev as { id?: unknown }).id : undefined
      return item && typeof item === 'object' && prevId != null
        ? { ...(item as Record<string, unknown>), id: prevId }
        : item
    })

    const updated = await payload.updateGlobal({
      slug: 'header',
      data: { navItems } as never,
      locale,
      overrideAccess: true,
    })
    return createSuccessResponse({ navItems: updated?.navItems ?? [] }, 200)
  } catch (error) {
    return handleRouteError('Update header', error)
  }
}
