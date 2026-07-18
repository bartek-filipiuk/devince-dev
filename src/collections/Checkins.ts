import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'
import { ownOrAdmin } from '../access/ownOrAdmin'

export const Checkins: CollectionConfig = {
  slug: 'checkins',
  access: { read: ownOrAdmin, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: { useAsTitle: 'date', defaultColumns: ['user', 'program', 'date', 'minimumDone'] },
  // Jeden check-in na (user, program, dzień) — upsert w route łapie wyścig.
  indexes: [{ fields: ['user', 'program', 'date'], unique: true }],
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'program', type: 'relationship', relationTo: 'program', required: true, index: true },
    { name: 'date', type: 'text', required: true }, // 'YYYY-MM-DD' w TZ programu
    { name: 'programDay', type: 'number', required: true },
    { name: 'minimumDone', type: 'checkbox', required: true, defaultValue: false },
    { name: 'note', type: 'textarea' },
    // Wartości pól zdefiniowanych w program.cohortConfig.checkinFields —
    // walidowane serwerowo w route wg configu (validateCheckinValues).
    { name: 'values', type: 'json' },
  ],
}
