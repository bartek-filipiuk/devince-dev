import type { Block } from 'payload'

export const CourseCallout: Block = {
  slug: 'courseCallout',
  interfaceName: 'CourseCalloutBlock',
  labels: { singular: 'Wyróżnienie / CTA', plural: 'Wyróżnienia / CTA' },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      localized: true,
      label: 'Nadtytuł (opcjonalny)',
    },
    {
      name: 'heading',
      type: 'text',
      required: true,
      localized: true,
      label: 'Nagłówek',
    },
    {
      name: 'body',
      type: 'textarea',
      localized: true,
      label: 'Treść (opcjonalna)',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'ctaLabel',
          type: 'text',
          localized: true,
          label: 'Tekst przycisku CTA (opcjonalny)',
          admin: { width: '50%' },
        },
        {
          name: 'ctaUrl',
          type: 'text',
          label: 'URL przycisku CTA (opcjonalny)',
          admin: { width: '50%' },
        },
      ],
    },
  ],
}
