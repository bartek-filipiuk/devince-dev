import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

export const CourseRichText: Block = {
  slug: 'courseRichText',
  interfaceName: 'CourseRichTextBlock',
  labels: { singular: 'Tekst', plural: 'Teksty' },
  fields: [
    {
      name: 'heading',
      type: 'text',
      localized: true,
      label: 'Nagłówek (opcjonalny)',
    },
    {
      name: 'body',
      type: 'richText',
      required: true,
      localized: true,
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
    },
  ],
}
