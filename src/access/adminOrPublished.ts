import type { Access } from 'payload'

// Admins read everything (drafts included); everyone else, logged-in customers too, only published docs.
export const adminOrPublished: Access = ({ req: { user } }) => {
  if (user?.roles?.includes('admin')) {
    return true
  }

  return {
    _status: {
      equals: 'published',
    },
  }
}
