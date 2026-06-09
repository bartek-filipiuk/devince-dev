import type { CollectionConfig } from 'payload'

import { adminOnlyField } from '../../access/adminOnly'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: ({ req: { user } }) => Boolean(user?.roles?.includes('admin')),
    create: ({ req: { user } }) => Boolean(user?.roles?.includes('admin')),
    delete: ({ req: { user } }) => Boolean(user?.roles?.includes('admin')),
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.roles?.includes('admin')) return true
      return { id: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.roles?.includes('admin')) return true
      return { id: { equals: user.id } }
    },
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      defaultValue: ['customer'],
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Customer', value: 'customer' },
      ],
      access: { update: adminOnlyField },
    },
    {
      name: 'purchases',
      type: 'relationship',
      relationTo: 'program',
      hasMany: true,
      // Mass-assignment guard: only admins (or trusted server code via
      // overrideAccess, e.g. the Stripe webhook) may set/grant purchases.
      // Without this a logged-in customer could PATCH /api/users/{ownId}
      // with { purchases: [anyProgramId] } and self-grant any paid course.
      access: { update: adminOnlyField, create: adminOnlyField },
    },
  ],
  timestamps: true,
}
