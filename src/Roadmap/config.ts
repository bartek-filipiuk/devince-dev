import type { GlobalConfig } from 'payload'
import { adminOnly } from '@/access/adminOnly'

export const Roadmap: GlobalConfig = {
  slug: 'roadmap',
  access: {
    read: () => true,
    update: adminOnly,
  },
  fields: [
    {
      name: 'items',
      type: 'array',
      labels: { singular: 'Roadmap item', plural: 'Roadmap items' },
      admin: { initCollapsed: true },
      fields: [
        { name: 'title', type: 'text', required: true, localized: true },
        { name: 'description', type: 'textarea', localized: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'planned',
          options: [
            { label: 'Planned', value: 'planned' },
            { label: 'In progress', value: 'in_progress' },
            { label: 'Done', value: 'done' },
          ],
        },
        {
          name: 'track',
          type: 'select',
          required: true,
          defaultValue: 'general',
          options: [
            { label: 'General', value: 'general' },
            { label: 'Apps', value: 'apps' },
            { label: 'Courses', value: 'courses' },
          ],
        },
      ],
    },
  ],
}
