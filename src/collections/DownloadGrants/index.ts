import type { CollectionConfig } from 'payload'
import { adminOnly } from '../../access/adminOnly'

/**
 * Purchase-fulfillment grants for app downloads (NO user accounts).
 *
 * Created exclusively by the Stripe webhook (Local API, overrideAccess: true)
 * after checkout.session.completed. The download route resolves tokens
 * server-side with overrideAccess: true. Admin-only for every op — there is
 * no end-user identity that could own these.
 */
export const DownloadGrants: CollectionConfig = {
  slug: 'download-grants',
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: { useAsTitle: 'email', hidden: false, defaultColumns: ['email', 'product', 'expiresAt', 'uses'] },
  fields: [
    { name: 'token', type: 'text', required: true, unique: true },
    { name: 'product', type: 'relationship', relationTo: 'products', required: true },
    { name: 'email', type: 'text', required: true, index: true },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'maxUses', type: 'number', required: true, defaultValue: 5 },
    { name: 'uses', type: 'number', required: true, defaultValue: 0 },
    // Audit + fulfillment idempotency: one grant per Checkout Session.
    { name: 'stripeSessionId', type: 'text', index: true },
  ],
}
