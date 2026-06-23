import { NextRequest } from 'next/server'
import { validateAuth } from '../../../_lib/auth.js'
import { createSuccessResponse, handleRouteError } from '../../../_lib/errors.js'
import { getPayloadClient, isErrorResponse, parseLocale, resolveDocId } from '../../../_lib/payload.js'
import { notifyProductBuyers } from '@/utilities/notifyBuyers'

/**
 * POST /api/external/products/:idOrSlug/notify-buyers — email every past buyer of
 * a product a FRESH signed download link to the CURRENT version (e.g. after a
 * security reship). Service communication ("version-update re-download"): finds
 * the product's download-grants, dedupes by email, issues a new 7-day grant per
 * buyer, sends a bilingual update email, and records the send on the new grant
 * (emailStatus/emailMessageId/emailSentAt — same tracking as the purchase email).
 *
 * Body: `{ note?: string }` — an optional reason line shown in the email
 * (e.g. "Krytyczna poprawka bezpieczeństwa v1.0.7"). Bearer EXTERNAL_API_TOKEN.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> },
) {
  const authError = validateAuth(request)
  if (authError) return authError

  let note: string | undefined
  try {
    const body = (await request.json()) as { note?: unknown }
    if (typeof body?.note === 'string' && body.note.trim()) note = body.note.trim()
  } catch {
    // Body is optional — a bare POST notifies with the default copy.
  }

  try {
    const { idOrSlug } = await params
    const locale = parseLocale(request)
    if (isErrorResponse(locale)) return locale

    const payload = await getPayloadClient()

    const productId = await resolveDocId(payload, 'products', idOrSlug, locale)
    if (isErrorResponse(productId)) return productId

    const result = await notifyProductBuyers(payload, productId, { note })
    return createSuccessResponse({ product: idOrSlug, ...result }, 200)
  } catch (error) {
    return handleRouteError('Notify buyers', error)
  }
}

export const dynamic = 'force-dynamic'
