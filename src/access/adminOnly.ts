import type { Access, FieldAccess } from 'payload'

export const adminOnly: Access = ({ req: { user } }) => Boolean(user?.roles?.includes('admin'))
export const adminOnlyField: FieldAccess = ({ req: { user } }) =>
  Boolean(user?.roles?.includes('admin'))
