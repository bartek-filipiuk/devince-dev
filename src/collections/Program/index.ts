import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { Archive } from '../../blocks/ArchiveBlock/config'
import { BrevoSignup } from '../../blocks/BrevoSignup/config'
import { CallToAction } from '../../blocks/CallToAction/config'
import { Content } from '../../blocks/Content/config'
import { FormBlock } from '../../blocks/Form/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
import { GlassHero } from '../../blocks/GlassHero/config'
import { Features } from '../../blocks/Features/config'
import { Testimonials } from '../../blocks/Testimonials/config'
import { ContactCTA } from '../../blocks/ContactCTA/config'
import { slugField } from 'payload'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { revalidateDelete, revalidateProgram } from './hooks/revalidateProgram'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

export const Program: CollectionConfig<'program'> = {
  slug: 'program',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  defaultPopulate: {
    title: true,
    slug: true,
    type: true,
    heroImage: true,
    startDate: true,
    endDate: true,
    format: true,
    pricing: true,
    meta: {
      image: true,
      description: true,
    },
  },
  admin: {
    defaultColumns: ['title', 'type', 'startDate', 'format', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'program',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'program',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Kurs', value: 'course' },
        { label: 'Warsztat', value: 'workshop' },
        { label: 'Wydarzenie', value: 'event' },
      ],
      defaultValue: 'course',
      admin: {
        position: 'sidebar',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Hero',
          fields: [
            {
              name: 'heroImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Obraz Hero',
            },
            {
              name: 'heroHeadline',
              type: 'text',
              localized: true,
              label: 'Nagłówek Hero',
            },
            {
              name: 'heroDescription',
              type: 'textarea',
              localized: true,
              label: 'Opis Hero',
            },
          ],
        },
        {
          label: 'Szczegóły',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'startDate',
                  type: 'date',
                  label: 'Data rozpoczęcia',
                  admin: {
                    date: {
                      pickerAppearance: 'dayAndTime',
                    },
                    width: '50%',
                  },
                },
                {
                  name: 'endDate',
                  type: 'date',
                  label: 'Data zakończenia',
                  admin: {
                    date: {
                      pickerAppearance: 'dayAndTime',
                    },
                    width: '50%',
                  },
                },
              ],
            },
            {
              name: 'format',
              type: 'select',
              label: 'Format',
              options: [
                { label: 'Online', value: 'online' },
                { label: 'Stacjonarnie', value: 'physical' },
                { label: 'Hybrydowo', value: 'hybrid' },
              ],
              defaultValue: 'online',
            },
            {
              name: 'onlineLink',
              type: 'text',
              label: 'Link do spotkania online',
              admin: {
                condition: (data) => data?.format === 'online' || data?.format === 'hybrid',
              },
            },
            {
              name: 'locationName',
              type: 'text',
              label: 'Nazwa lokalizacji',
              localized: true,
              admin: {
                condition: (data) => data?.format === 'physical' || data?.format === 'hybrid',
              },
            },
            {
              name: 'locationAddress',
              type: 'textarea',
              label: 'Adres lokalizacji',
              localized: true,
              admin: {
                condition: (data) => data?.format === 'physical' || data?.format === 'hybrid',
              },
            },
            {
              name: 'pricing',
              type: 'select',
              label: 'Cennik',
              options: [
                { label: 'Bezpłatnie', value: 'free' },
                { label: 'Płatne', value: 'paid' },
              ],
            },
            {
              name: 'duration',
              type: 'text',
              label: 'Czas trwania (np. "8 tygodni")',
              localized: true,
              admin: {
                condition: (data) => data?.type === 'course',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'ctaLabel',
                  type: 'text',
                  label: 'Tekst przycisku CTA',
                  localized: true,
                  admin: {
                    width: '50%',
                  },
                },
                {
                  name: 'ctaUrl',
                  type: 'text',
                  label: 'URL przycisku CTA',
                  admin: {
                    width: '50%',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Treść',
          fields: [
            {
              name: 'layout',
              type: 'blocks',
              blocks: [
                GlassHero,
                Features,
                Testimonials,
                ContactCTA,
                BrevoSignup,
                CallToAction,
                Content,
                MediaBlock,
                Archive,
                FormBlock,
              ],
              admin: {
                initCollapsed: true,
              },
            },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),
            MetaDescriptionField({}),
            PreviewField({
              hasGenerateFn: true,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date()
            }
            return value
          },
        ],
      },
    },
    slugField(),
  ],
  hooks: {
    afterChange: [revalidateProgram],
    beforeChange: [populatePublishedAt],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100,
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
