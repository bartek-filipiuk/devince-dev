import type { Access } from 'payload'

// A signed-in user may read only their own rows; admins read all. Participant
// writes go exclusively through the app routes (Local API + overrideAccess), so
// create/update/delete on the collection stay admin-only.
export const ownOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if ((user.roles ?? []).includes('admin')) return true
  return { user: { equals: user.id } }
}
