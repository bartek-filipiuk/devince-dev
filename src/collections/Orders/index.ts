import type { CollectionConfig } from 'payload'
import { adminOnly } from '../../access/adminOnly'

/**
 * Money ledger: one row per PAID checkout, every surface (courses, apps, NDQS).
 * Written only by the Stripe webhook (recordOrder, overrideAccess) right after
 * the grant; refunds stamp refundedAt/refundedAmount. Admins can only edit notes.
 * Service progress (form, card, report, review) lives in the owner's sheet.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  access: { read: adminOnly, create: () => false, update: adminOnly, delete: () => false },
  admin: {
    useAsTitle: 'email',
    defaultColumns: [
      'createdAt',
      'title',
      'email',
      'amountPaid',
      'currency',
      'refundedAt',
      'surface',
    ],
    description:
      'Wszystkie opłacone zamówienia (kwoty w groszach). Zapisuje je webhook Stripe; edytujesz tylko notatki.',
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'stripeSessionId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'surface',
      type: 'select',
      required: true,
      options: [
        { label: 'Kursy i usługi', value: 'courses' },
        { label: 'Aplikacje', value: 'apps' },
        { label: 'NDQS', value: 'ndqs' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'item',
      type: 'text',
      admin: { readOnly: true, description: 'Slug produktu w chwili zakupu.' },
    },
    { name: 'title', type: 'text', admin: { readOnly: true } },
    { name: 'email', type: 'text', required: true, index: true, admin: { readOnly: true } },
    {
      name: 'amountPaid',
      type: 'number',
      admin: { readOnly: true, description: 'W groszach/centach (59000 = 590,00).' },
    },
    { name: 'currency', type: 'text', admin: { readOnly: true } },
    { name: 'refundedAt', type: 'date', admin: { readOnly: true } },
    {
      name: 'refundedAmount',
      type: 'number',
      admin: { readOnly: true, description: 'Suma zwrotów w groszach.' },
    },
    { name: 'notes', type: 'textarea' },
  ],
}
