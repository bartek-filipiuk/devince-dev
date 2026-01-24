import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { link } from '../../fields/link'

export const GlassHero: Block = {
  slug: 'glassHero',
  interfaceName: 'GlassHeroBlock',
  fields: [
    {
      name: 'headline',
      type: 'text',
      required: true,
      label: 'Headline',
    },
    {
      name: 'subheadline',
      type: 'richText',
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
      label: 'Subheadline',
    },
    {
      type: 'row',
      fields: [
        link({
          appearances: ['default', 'outline'],
          overrides: {
            name: 'primaryCTA',
            label: 'Primary CTA',
            admin: {
              width: '50%',
            },
          },
        }),
        link({
          appearances: ['default', 'outline'],
          overrides: {
            name: 'secondaryCTA',
            label: 'Secondary CTA',
            admin: {
              width: '50%',
            },
          },
        }),
      ],
    },
    {
      name: 'backgroundMedia',
      type: 'upload',
      relationTo: 'media',
      label: 'Background Media (optional)',
    },
  ],
  labels: {
    plural: 'Glass Heroes',
    singular: 'Glass Hero',
  },
}
