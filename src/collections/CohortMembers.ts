import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'
import { ownOrAdmin } from '../access/ownOrAdmin'

export const CohortMembers: CollectionConfig = {
  slug: 'cohort-members',
  access: { read: ownOrAdmin, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: { useAsTitle: 'id', defaultColumns: ['user', 'cohort', 'program', 'joinedAt'] },
  // Jedna kohorta na (user, program) — atomowo na poziomie DB.
  indexes: [{ fields: ['user', 'program'], unique: true }],
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'cohort', type: 'relationship', relationTo: 'cohorts', required: true },
    { name: 'program', type: 'relationship', relationTo: 'program', required: true, index: true },
    { name: 'joinedAt', type: 'date' },
  ],
}
