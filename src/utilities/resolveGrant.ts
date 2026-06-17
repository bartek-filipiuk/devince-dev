import type { Payload } from 'payload'
import type { DownloadGrant, Product } from '@/payload-types'
import { evaluateGrant, verifyDownloadToken } from './downloadToken'

export type ResolvedGrant =
  | { status: 'invalid' }
  | { status: 'expired' | 'limit'; grant: DownloadGrant }
  | { status: 'ok'; grant: DownloadGrant; product: Product }

/**
 * Token -> grant resolution for account-less downloads. HMAC verification runs
 * BEFORE any DB access, so forged/malformed tokens never touch the database.
 */
export async function resolveGrant(payload: Payload, token: string): Promise<ResolvedGrant> {
  const secret = process.env.DOWNLOAD_TOKEN_SECRET
  if (!secret || !verifyDownloadToken({ token, secret })) return { status: 'invalid' }

  const found = await payload.find({
    collection: 'download-grants',
    where: { token: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const grant = found.docs[0]
  if (!grant) return { status: 'invalid' }

  // evaluateGrant expects { expiresAt, uses, maxUses }; all three are required
  // (non-nullable) in the DownloadGrant schema, so no coercion needed.
  const check = evaluateGrant(grant, new Date())
  if (!check.ok) return { status: check.reason, grant }

  const productId = typeof grant.product === 'object' ? grant.product.id : grant.product

  let product: Product
  try {
    product = await payload.findByID({
      collection: 'products',
      id: productId,
      depth: 0,
      overrideAccess: true,
    })
  } catch {
    return { status: 'invalid' }
  }

  return { status: 'ok', grant, product }
}
