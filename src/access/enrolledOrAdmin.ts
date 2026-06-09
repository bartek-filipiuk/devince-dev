import type { Access } from 'payload'

export const enrolledOrAdmin: Access = ({ req: { user } }) => {
  if (!user) return false
  if (Array.isArray(user.roles) && user.roles.includes('admin')) return true
  const ids = (user.purchases ?? []).map((p) => (typeof p === 'object' && p ? p.id : p))
  return { program: { in: ids } }
}
