import type { Block } from 'payload'

export const CourseImage: Block = {
  slug: 'courseImage',
  interfaceName: 'CourseImageBlock',
  labels: { singular: 'Obraz', plural: 'Obrazy' },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Obraz',
    },
    {
      name: 'caption',
      type: 'text',
      localized: true,
      label: 'Podpis (opcjonalny)',
    },
  ],
}
