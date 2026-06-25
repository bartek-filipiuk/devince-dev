import type { GlobalConfig } from 'payload'

/**
 * Public platform changelog (sibling of the `roadmap` global). Entries are authored
 * at work-time as repo fragments (`src/changelog/fragments`) and ingested into this
 * global on boot — no runtime LLM, no API keys. `text` is localized (PL/EN);
 * `tag`/`date`/`sourceId` are shared. `sourceId` is the fragment id an entry was
 * ingested from, so each fragment lands at most once (idempotent ingest). Editable
 * via the admin and `GET/PATCH /api/external/changelog`.
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
          name: 'sourceId',
          type: 'text',
          admin: {
            readOnly: true,
            description: 'Fragment id this entry was ingested from (idempotency).',
          },
        },
      ],
    },
  ],
}
