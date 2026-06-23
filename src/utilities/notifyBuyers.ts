import type { Payload } from 'payload'
import { createDownloadToken } from './downloadToken'
import { sendProductUpdateEmail } from './brevo'

/**
 * Shared "notify past buyers of a product with a fresh re-download link" logic,
 * used by BOTH the external API route (Bearer token) and the admin-panel endpoint
 * (logged-in admin). A fresh grant points at the product, so /download/<token>
 * streams its CURRENT files — buyers get the new version. Service communication
 * for version/security updates (roadmap Apps-C).
 */

function uniqueEmailsFromGrants(docs: Array<{ email?: unknown }>): string[] {
  return Array.from(
    new Set(
      docs
        .map((g) => String(g.email ?? '').trim().toLowerCase())
        .filter((e) => e.length > 0),
    ),
  )
}

/** How many unique buyers would be notified (for an admin preview). */
export async function countProductBuyers(
  payload: Payload,
  productId: number | string,
): Promise<number> {
  const grants = await payload.find({
    collection: 'download-grants',
    where: { product: { equals: productId } },
    limit: 5000,
    depth: 0,
    overrideAccess: true,
  })
  return uniqueEmailsFromGrants(grants.docs as Array<{ email?: unknown }>).length
}

export interface NotifyResult {
  buyers: number
  notified: number
  failed: number
}

export async function notifyProductBuyers(
  payload: Payload,
  productId: number | string,
  opts?: { note?: string },
): Promise<NotifyResult> {
  const secret = process.env.DOWNLOAD_TOKEN_SECRET
  if (!secret) throw new Error('DOWNLOAD_TOKEN_SECRET not set')

  const product = await payload.findByID({
    collection: 'products',
    id: productId,
    depth: 0,
    overrideAccess: true,
  })
  const productTitle = (product as { title?: string } | null)?.title ?? 'Twój produkt'

  const grants = await payload.find({
    collection: 'download-grants',
    where: { product: { equals: productId } },
    limit: 5000,
    depth: 0,
    overrideAccess: true,
  })
  const emails = uniqueEmailsFromGrants(grants.docs as Array<{ email?: unknown }>)

  const base = process.env.NEXT_PUBLIC_APPS_URL ?? 'https://apps.devince.dev'
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Per-buyer work, isolated so one failure never aborts the run: fresh grant →
  // send the update email → record the send outcome on the grant.
  const notifyOne = async (email: string): Promise<'sent' | 'failed'> => {
    try {
      const token = createDownloadToken(secret)
      const grant = await payload.create({
        collection: 'download-grants',
        data: { token, product: productId, email, expiresAt, maxUses: 5, uses: 0 } as never,
        overrideAccess: true,
      })
      let emailMessageId: string | null = null
      let emailStatus: 'sent' | 'failed' = 'failed'
      try {
        emailMessageId = await sendProductUpdateEmail({
          to: email,
          link: `${base}/download/${token}`,
          productTitle,
          note: opts?.note,
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
        // best-effort tracking write
      }
      return emailStatus
    } catch {
      return 'failed'
    }
  }

  // Bounded concurrency: process buyers in parallel chunks rather than one-by-one.
  // The Brevo HTTP transactional API (api.brevo.com/v3/smtp/email) is rate-limited,
  // so ~15 in flight is comfortably within limits and ~15x faster than sequential
  // — keeps the admin "Notify" request well under timeout for tens/low-hundreds of
  // buyers. (For thousands, move to a background job — see Apps-C notes.)
  const CONCURRENCY = 15
  let notified = 0
  let failed = 0
  for (let i = 0; i < emails.length; i += CONCURRENCY) {
    const chunk = emails.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(chunk.map(notifyOne))
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value === 'sent') notified++
      else failed++
    }
  }

  return { buyers: emails.length, notified, failed }
}
