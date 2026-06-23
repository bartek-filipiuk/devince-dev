import { NextRequest } from 'next/server'
import { validateAuth } from '../../../_lib/auth.js'
import { createErrorResponse, createSuccessResponse, handleRouteError } from '../../../_lib/errors.js'
import { getPayloadClient, isErrorResponse, parseLocale, resolveDocId } from '../../../_lib/payload.js'
import { createDownloadToken } from '@/utilities/downloadToken'
import { sendProductUpdateEmail } from '@/utilities/brevo'

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

    const secret = process.env.DOWNLOAD_TOKEN_SECRET
    if (!secret) return createErrorResponse('SERVICE_UNAVAILABLE', 'DOWNLOAD_TOKEN_SECRET not set')

    const payload = await getPayloadClient()

    const productId = await resolveDocId(payload, 'products', idOrSlug, locale)
    if (isErrorResponse(productId)) return productId

    const product = await payload.findByID({
      collection: 'products',
      id: productId,
      depth: 0,
      overrideAccess: true,
    })
    const productTitle = (product as { title?: string } | null)?.title ?? 'Twój produkt'

    // All grants for this product → unique buyer emails (normalized, deduped).
    const grants = await payload.find({
      collection: 'download-grants',
      where: { product: { equals: productId } },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    })
    const emails = Array.from(
      new Set(
        grants.docs
          .map((g) => String((g as { email?: unknown }).email ?? '').trim().toLowerCase())
          .filter((e) => e.length > 0),
      ),
    )

    const base = process.env.NEXT_PUBLIC_APPS_URL ?? 'https://apps.devince.dev'
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    let notified = 0
    let failed = 0

    for (const email of emails) {
      try {
        // A fresh grant points at the product → /download/<token> streams its
        // CURRENT downloadFiles, so the buyer gets the new version.
        const token = createDownloadToken(secret)
        const grant = await payload.create({
          collection: 'download-grants',
          data: { token, product: productId, email, expiresAt, maxUses: 5, uses: 0 } as never,
          overrideAccess: true,
        })
        let emailMessageId: string | null = null
        let emailStatus = 'failed'
        try {
          emailMessageId = await sendProductUpdateEmail({
            to: email,
            link: `${base}/download/${token}`,
            productTitle,
            note,
          })
          emailStatus = 'sent'
        } catch {
          emailStatus = 'failed'
        }
        try {
          await payload.update({
            collection: 'download-grants',
            id: (grant as { id: number | string }).id,
            data: { emailStatus, emailSentAt: new Date().toISOString(), emailMessageId } as never,
            overrideAccess: true,
          })
        } catch {
          // best-effort tracking write — never fail the notification on it
        }
        if (emailStatus === 'sent') notified++
        else failed++
      } catch {
        failed++
      }
    }

    return createSuccessResponse(
      { product: idOrSlug, buyers: emails.length, notified, failed },
      200,
    )
  } catch (error) {
    return handleRouteError('Notify buyers', error)
  }
}

export const dynamic = 'force-dynamic'
