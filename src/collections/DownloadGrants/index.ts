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
  admin: {
    useAsTitle: 'email',
    hidden: false,
    // Sales panel: see at a glance who bought which product + tier, for how much.
    defaultColumns: ['email', 'product', 'tier', 'amountPaid', 'currency', 'createdAt'],
  },
  fields: [
    { name: 'token', type: 'text', required: true, unique: true },
    { name: 'product', type: 'relationship', relationTo: 'products', required: true },
    { name: 'email', type: 'text', required: true, index: true },
    // Purchase record (sales panel). Set from the Stripe session in
    // fulfillAppPurchase. All optional — absent for free lead-magnet claims and
    // for single-price (non-tiered) products (which have no tier name).
    { name: 'tier', type: 'text', admin: { description: 'Wybrana licencja (np. Starter/Pro/Agency); puste dla produktów bez progów.' } },
    { name: 'amountPaid', type: 'number', admin: { description: 'Kwota zapłacona w groszach/centach (np. 14900 = 149,00).' } },
    { name: 'currency', type: 'text', admin: { description: 'Waluta płatności (np. pln, usd).' } },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'maxUses', type: 'number', required: true, defaultValue: 5 },
    { name: 'uses', type: 'number', required: true, defaultValue: 0 },
    // Art. 38 pkt 13 ustawy o prawach konsumenta: timestamp of the buyer's
    // express consent (given at checkout via a separate checkbox) to begin
    // delivery immediately AND acknowledge losing the right of withdrawal.
    // Set from the Stripe session metadata in fulfillAppPurchase. The
    // durable-medium confirmation (the download email) echoes this date.
    { name: 'withdrawalConsentAt', type: 'date' },
    // Fulfillment idempotency is enforced by this unique constraint; the
    // find-then-create in fulfillAppPurchase is the fast path, the constraint
    // is the backstop that closes the TOCTOU race on concurrent deliveries.
    { name: 'stripeSessionId', type: 'text', unique: true },
  ],
}
