import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

import { adminOnly } from '../../access/adminOnly'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Private upload collection for purchased app downloads.
 *
 * Files are stored OUTSIDE the public web root (../../../private-media-apps)
 * and every access op is admin-only. The only delivery path is the
 * grant-gated streaming route /api/apps/download/[token], which verifies the
 * HMAC token + expiry + use-limit and then loads the asset with
 * overrideAccess: true. No public URL is ever exposed.
 */
export const AppAssets: CollectionConfig = {
  slug: 'app-assets',
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
    staticDir: path.resolve(dirname, '../../../private-media-apps'),
    disableLocalStorage: false,
  },
}
