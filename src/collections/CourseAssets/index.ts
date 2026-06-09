import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

import { adminOnly } from '../../access/adminOnly'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Private upload collection for gated course downloads.
 *
 * Unlike `media` (staticDir = public/media, read: anyone), files here are
 * stored OUTSIDE the public web root (../../../private-media) and every access
 * op is admin-only. Payload still exposes /api/course-assets/file/<name>, but
 * that route enforces `read` access — so anon/customer requests are denied.
 *
 * The gated download route (/api/course/download/[id]) first checks lesson
 * enrollment with overrideAccess: false + user, then loads the asset with
 * overrideAccess: true and STREAMS the bytes back. No public URL is exposed.
 */
export const CourseAssets: CollectionConfig = {
  slug: 'course-assets',
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    useAsTitle: 'filename',
    hidden: false,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
  upload: {
    // PRIVATE: outside public/ so files are never served as static assets.
    staticDir: path.resolve(dirname, '../../../private-media'),
    disableLocalStorage: false,
  },
}
