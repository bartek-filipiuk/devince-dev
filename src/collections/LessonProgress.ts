import type { Access, CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'

// A signed-in user may read only their own rows; admins read all. Writes happen
// exclusively through the authenticated progress route via the Local API
// (overrideAccess), so create/update/delete are admin-only at the collection.
const ownOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if ((user.roles ?? []).includes('admin')) return true
  return { user: { equals: user.id } }
}

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
