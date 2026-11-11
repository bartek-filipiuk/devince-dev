import type { CollectionConfig } from 'payload'

import { adminOnlyField } from '../../access/adminOnly'
import { APIError } from 'payload'
import type { CollectionBeforeOperationHook } from 'payload'
import { ACCESS_LINK_DAYS } from '../../utilities/purchaseOnboarding'

/**
 * No email adapter: a public POST /api/users/forgot-password would only REPLACE
 * the buyer's valid set-password token with one nobody receives (anyone knowing
 * the email could lock a buyer out). Only server code that delivers the token
 * itself (disableEmail: true: purchase webhook, claims) may mint one.
 * Remove when a Brevo email adapter + reset email exist.
 */
export const blockUndeliverableReset: CollectionBeforeOperationHook = ({ args, operation }) => {
  if (operation === 'forgotPassword' && (args as { disableEmail?: boolean }).disableEmail !== true)
    throw new APIError('Password reset by email is not available.', 403)
  return args
}

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
  // The only reset tokens buyers get arrive in the purchase/claim email (no email
  // adapter). Payload's 1 h default locked out anyone who opened it later.
  auth: { forgotPassword: { expiration: ACCESS_LINK_DAYS * 24 * 60 * 60 * 1000 } },
  hooks: { beforeOperation: [blockUndeliverableReset] },
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
