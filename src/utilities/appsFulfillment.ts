import type { Payload } from 'payload'
import { createDownloadToken } from './downloadToken'

const GRANT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const GRANT_MAX_USES = 5

/**
 * Account-less fulfillment for app purchases: create one DownloadGrant per
 * Checkout Session. Idempotent — re-delivered webhooks for the same session
 * find the existing grant and do nothing.
 */
export async function fulfillAppPurchase(
  payload: Payload,
  args: { productId: number | string; email: string; sessionId: string },
): Promise<{ created: boolean; token?: string }> {
  const existing = await payload.find({
    collection: 'download-grants',
    where: { stripeSessionId: { equals: args.sessionId } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs.length) return { created: false }

  const secret = process.env.DOWNLOAD_TOKEN_SECRET
  if (!secret) throw new Error('DOWNLOAD_TOKEN_SECRET is not set')

  const token = createDownloadToken(secret)
  try {
    await payload.create({
      collection: 'download-grants',
      data: {
        token,
        product: args.productId,
        email: args.email,
        expiresAt: new Date(Date.now() + GRANT_TTL_MS).toISOString(),
        maxUses: GRANT_MAX_USES,
        uses: 0,
        stripeSessionId: args.sessionId,
      } as never,
      overrideAccess: true,
    })
  } catch (err) {
    // Check whether a concurrent delivery already created the grant (unique
    // constraint violation). If so, treat as idempotent; otherwise rethrow.
    const race = await payload.find({
      collection: 'download-grants',
      where: { stripeSessionId: { equals: args.sessionId } },
      limit: 1,
      overrideAccess: true,
    })
    if (race.docs.length) return { created: false }
    throw err
  }
  return { created: true, token }
}
