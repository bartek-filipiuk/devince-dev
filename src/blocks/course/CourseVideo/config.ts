import type { Block } from 'payload'

export const CourseVideo: Block = {
  slug: 'courseVideo',
  interfaceName: 'CourseVideoBlock',
  labels: { singular: 'Wideo', plural: 'Wideo' },
  fields: [
    {
      name: 'url',
      type: 'text',
      required: true,
      label: 'URL',
      admin: {
        description: 'YouTube / Vimeo / dowolny https embed',
      },
    },
    {
      name: 'caption',
      type: 'text',
      localized: true,
      label: 'Podpis (opcjonalny)',
    },
  ],
}
