import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'

// Films served by the public channel MCP (/api/channel/mcp). Written only by the
// video pipeline through PUT /api/external/videos/:slug. Not readable over the
// Payload REST/GraphQL API: the MCP tools read with overrideAccess and show a
// film only once publishedAt has passed (scheduled uploads stay hidden).
export const Videos: CollectionConfig = {
  slug: 'videos',
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'publishedAt', 'hidden', 'product'] },
  defaultSort: '-publishedAt',
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'title', type: 'text', required: true },
    { name: 'youtubeId', type: 'text', required: true, unique: true },
    { name: 'publishedAt', type: 'date', required: true, index: true },
    { name: 'hidden', type: 'checkbox', defaultValue: false, index: true },
    { name: 'summary', type: 'textarea' },
    { name: 'description', type: 'textarea' },
    { name: 'tags', type: 'json' },
    {
      name: 'chapters',
      type: 'array',
      fields: [
        { name: 'tMs', type: 'number', required: true },
        { name: 'label', type: 'text', required: true },
      ],
    },
    // Film-timeline transcript, one cue per line: "[mm:ss] text".
    { name: 'transcript', type: 'textarea' },
    {
      name: 'publicFiles',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'content', type: 'textarea', required: true },
      ],
    },
    { name: 'product', type: 'relationship', relationTo: 'products' },
  ],
}
