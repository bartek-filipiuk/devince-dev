import { NextRequest } from 'next/server'
import { validateAuth } from '../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../_lib/errors.js'
import { getPayloadClient, isErrorResponse, parseLocale } from '../_lib/payload.js'

/**
 * GET /api/external/changelog — read the public changelog (the `changelog` Payload
 * global). `?locale=pl|en` (default pl) selects the language of the localized note
 * `text`. Bearer EXTERNAL_API_TOKEN. This is the manual correction surface for the
 * auto-published feed (fix a typo / hide a bad note after the deploy webhook ran).
 */
export async function GET(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError

  try {
    const locale = parseLocale(request)
    if (isErrorResponse(locale)) return locale

    const payload = await getPayloadClient()
    const changelog = await payload.findGlobal({
      slug: 'changelog',
      locale,
      depth: 0,
      overrideAccess: true,
    })
    return createSuccessResponse({ entries: changelog?.entries ?? [] }, 200)
  } catch (error) {
    return handleRouteError('Read changelog', error)
  }
}

/**
 * PATCH /api/external/changelog — replace the changelog entries. Send the FULL
 * `entries` array (each entry: `{ date, notes: [{ text, tag }], toSha?, prRefs? }`).
 * `?locale=` writes that language's note `text`.
 *
 * Note `text` is LOCALIZED; `tag`/`date`/`toSha` are shared. To update one locale
 * WITHOUT dropping the other locale's text, the caller carries each existing entry's
 * (and note's) `id` (from a prior GET/PATCH) — Payload then matches array rows by id
 * and only writes this language's text onto them. Rows without an id are created
 * fresh. We pass entries through as-is and let Payload's native id-matching do the
 * right thing. Recipe: PATCH ?locale=pl (no ids -> created, response carries ids) ->
 * PATCH ?locale=en with those ids. Bearer EXTERNAL_API_TOKEN.
 */
export async function PATCH(request: NextRequest) {
  const authError = validateAuth(request)
  if (authError) return authError

  let body: { entries?: unknown }
  try {
    body = (await request.json()) as { entries?: unknown }
  } catch {
    return createErrorResponse('VALIDATION_ERROR', 'Request body must be valid JSON')
  }

  try {
    const locale = parseLocale(request)
    if (isErrorResponse(locale)) return locale

    if (!Array.isArray(body.entries)) {
      return createErrorResponse('VALIDATION_ERROR', 'entries must be an array')
    }

    const payload = await getPayloadClient()
    const updated = await payload.updateGlobal({
      slug: 'changelog',
      data: { entries: body.entries } as never,
      locale,
      overrideAccess: true,
    })
    return createSuccessResponse({ entries: updated?.entries ?? [] }, 200)
  } catch (error) {
    return handleRouteError('Update changelog', error)
  }
}
