import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { link } from '../../fields/link'

export const ContactCTA: Block = {
  slug: 'contactCTA',
  interfaceName: 'ContactCTABlock',
  fields: [
    {
      name: 'headline',
      type: 'text',
      required: true,
      defaultValue: 'Ready to Get Started?',
    },
    {
      name: 'description',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h3', 'h4'] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
    },
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      label: 'Embed Form (optional)',
    },
    {
      name: 'contactEmail',
      type: 'email',
      label: 'Contact Email (optional)',
    },
    {
      name: 'contactPhone',
      type: 'text',
      label: 'Contact Phone (optional)',
    },
    {
      name: 'socialLinks',
      type: 'array',
      label: 'Social Links',
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: [
            { label: 'Twitter/X', value: 'twitter' },
            { label: 'Facebook', value: 'facebook' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'YouTube', value: 'youtube' },
            { label: 'GitHub', value: 'github' },
            { label: 'Discord', value: 'discord' },
          ],
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
      ],
    },
    link({
      appearances: ['default', 'outline'],
      overrides: {
        name: 'primaryCTA',
        label: 'Primary CTA',
      },
    }),
  ],
  labels: {
    plural: 'Contact CTAs',
    singular: 'Contact CTA',
  },
}
