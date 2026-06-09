import type { CollectionConfig } from 'payload'
import { authenticated } from '../../access/authenticated'

export const StripeEvents: CollectionConfig = {
  slug: 'stripe-events',
  access: { read: authenticated, create: authenticated, update: authenticated, delete: authenticated },
  admin: { useAsTitle: 'eventId', hidden: true },
  fields: [
    { name: 'eventId', type: 'text', required: true, unique: true, index: true },
    { name: 'type', type: 'text' },
  ],
}
