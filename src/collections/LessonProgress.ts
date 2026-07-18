import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'
import { ownOrAdmin } from '../access/ownOrAdmin'

export const LessonProgress: CollectionConfig = {
  slug: 'lesson-progress',
  access: { read: ownOrAdmin, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'lesson', 'program', 'completedAt'],
  },
  // Compound unique index → atomic single-row-per-(user,lesson); the route
  // catches the unique violation on a concurrent double-complete.
  indexes: [{ fields: ['user', 'lesson'], unique: true }],
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'lesson', type: 'relationship', relationTo: 'lessons', required: true },
    { name: 'program', type: 'relationship', relationTo: 'program', required: true, index: true },
    { name: 'completedAt', type: 'date' },
  ],
}
