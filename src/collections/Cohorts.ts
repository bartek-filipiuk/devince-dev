import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'

export const Cohorts: CollectionConfig = {
  slug: 'cohorts',
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'program', 'startDate'] },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'program', type: 'relationship', relationTo: 'program', required: true, index: true },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        description:
          'Dzień 1 programu — lekcje odblokowują się od tej daty o godzinie z konfiguracji kursu',
      },
    },
  ],
}
