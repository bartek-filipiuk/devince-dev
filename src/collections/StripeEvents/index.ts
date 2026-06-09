import type { CollectionConfig } from 'payload'
import { adminOnly } from '../../access/adminOnly'

export const StripeEvents: CollectionConfig = {
  slug: 'stripe-events',
  // Admin-only for all ops. The Stripe webhook writes/reads these via the Local
  // API with overrideAccess: true, so it is unaffected by this restriction.
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: { useAsTitle: 'eventId', hidden: true },
  fields: [
    { name: 'eventId', type: 'text', required: true, unique: true, index: true },
    { name: 'type', type: 'text' },
  ],
}
