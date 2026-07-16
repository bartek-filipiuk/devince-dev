import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { link } from '../../fields/link'

export const BuildLogHero: Block = {
  slug: 'buildLogHero',
  interfaceName: 'BuildLogHeroBlock',
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      localized: true,
      label: 'Eyebrow (nad headlinem)',
      defaultValue: 'devince.dev / solo builder / Wrocław',
    },
    {
      name: 'headline',
      type: 'text',
      required: true,
      localized: true,
      label: 'Headline',
    },
    {
      name: 'lede',
      type: 'richText',
      localized: true,
      editor: lexicalEditor({
        features: ({ rootFeatures }) => [
          ...rootFeatures,
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ],
      }),
      label: 'Lede (akapit pod headlinem)',
    },
    {
      type: 'row',
      fields: [
        link({
          appearances: ['default', 'outline'],
          overrides: {
            name: 'primaryCTA',
            label: 'Primary CTA',
            admin: { width: '50%' },
          },
        }),
        link({
          appearances: ['default', 'outline'],
          overrides: {
            name: 'secondaryCTA',
            label: 'Secondary CTA',
            admin: { width: '50%' },
          },
        }),
      ],
    },
    {
      name: 'showLog',
      type: 'checkbox',
      defaultValue: true,
      label: 'Pokaż panel build-log (ostatnie posty/projekty)',
    },
    {
      name: 'showStats',
      type: 'checkbox',
      defaultValue: true,
      label: 'Pokaż pasek statusu (liczby platformy)',
    },
    {
      name: 'customStatLabel',
      type: 'text',
      localized: true,
      label: 'Własny stat — etykieta (np. "Sesja buildu")',
    },
    {
      name: 'customStatValue',
      type: 'text',
      localized: true,
      label: 'Własny stat — wartość (np. "15 min")',
    },
  ],
  labels: {
    plural: 'Build Log Heroes',
    singular: 'Build Log Hero',
  },
}
