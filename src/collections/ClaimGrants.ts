import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'

/**
 * Single-use markers for free lead-magnet claims (the security boundary's
 * replay protection).
 *
 * The confirm route (`/claim/confirmed`) try-creates ONE row per claim token
 * BEFORE granting any access. The `token` UNIQUE index makes that create the
 * atomic single-use gate: a second confirm of the same token hits the unique
 * constraint, the route catches it, and refuses to grant again (no double
 * download grant, no double course enrolment, no DOI re-fire).
 *
 * Written exclusively by the confirm route via the Local API (overrideAccess).
 * There is no end-user identity that owns these, so every op is admin-only.
 */
export const ClaimGrants: CollectionConfig = {
  slug: 'claim-grants',
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: {
    useAsTitle: 'email',
    hidden: false,
    defaultColumns: ['email', 'kind', 'itemId', 'claimedAt'],
  },
  fields: [
    // The signed claim token, verbatim. UNIQUE → the single-use backstop: the
    // confirm route's create fails on the second use of the same token.
    { name: 'token', type: 'text', required: true, unique: true },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'App', value: 'app' },
        { label: 'Course', value: 'course' },
      ],
    },
    // Stored as text (program/product ids are numeric but we keep the token's
    // string form for a faithful audit trail of exactly what was granted).
    { name: 'itemId', type: 'text', required: true },
    { name: 'email', type: 'text', required: true, index: true },
    { name: 'claimedAt', type: 'date' },
  ],
}
