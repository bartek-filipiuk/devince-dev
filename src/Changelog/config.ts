import type { GlobalConfig } from 'payload'

/**
 * Public platform changelog (sibling of the `roadmap` global). Entries are
 * auto-published from a deploy webhook (`/api/changelog/generate`): PRs since the
 * last entry are summarized by Claude into short PL/EN notes. `text` is localized
 * (PL/EN); `tag`/`date`/`toSha` are shared. `toSha` records the HEAD commit a
 * given entry covers — it is the idempotency pointer the generator reads back as
 * `lastSha`. Editable via the admin and `GET/PATCH /api/external/changelog`.
 */
export const Changelog: GlobalConfig = {
  slug: 'changelog',
  access: {
    read: () => true,
  },
  admin: { group: 'Content' },
  fields: [
    {
      name: 'entries',
      type: 'array',
      labels: { singular: 'Changelog entry', plural: 'Changelog entries' },
      admin: { initCollapsed: true },
      fields: [
        { name: 'date', type: 'date', required: true },
        {
          name: 'notes',
          type: 'array',
          required: true,
          minRows: 1,
          labels: { singular: 'Note', plural: 'Notes' },
          fields: [
            { name: 'text', type: 'textarea', required: true, localized: true },
            {
              name: 'tag',
              type: 'select',
              required: true,
              defaultValue: 'platform',
              options: [
                { label: 'Apps', value: 'apps' },
                { label: 'Courses', value: 'courses' },
                { label: 'Platform', value: 'platform' },
                { label: 'Security', value: 'security' },
              ],
            },
          ],
        },
        {
          name: 'toSha',
          type: 'text',
          admin: {
            readOnly: true,
            description: 'HEAD commit sha covered by this entry (idempotency pointer).',
          },
        },
        {
          name: 'prRefs',
          type: 'array',
          admin: { readOnly: true },
          labels: { singular: 'PR', plural: 'PRs' },
          fields: [{ name: 'number', type: 'number' }],
        },
      ],
    },
  ],
}
