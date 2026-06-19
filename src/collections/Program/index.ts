import type { CollectionConfig } from 'payload'

import { adminOnly } from '../../access/adminOnly'
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
import { CourseRichText } from '../../blocks/course/CourseRichText/config'
import { CourseVideo } from '../../blocks/course/CourseVideo/config'
import { CourseImage } from '../../blocks/course/CourseImage/config'
import { CourseCallout } from '../../blocks/course/CourseCallout/config'
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
    create: adminOnly,
    delete: adminOnly,
    read: authenticatedOrPublished,
    update: adminOnly,
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
              name: 'stripePaymentLink',
              type: 'text',
              label: 'Stripe Payment Link (dla płatnych)',
              admin: { condition: (data) => data?.pricing === 'paid' },
            },
            {
              name: 'stripePriceId',
              type: 'text',
              label: 'Stripe Price ID (opcjonalnie)',
              admin: { condition: (data) => data?.pricing === 'paid' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'priceCents',
                  type: 'number',
                  min: 0,
                  admin: {
                    description: 'Cena w najmniejszej jednostce waluty (np. 4700 = 47,00 zł). Trzymaj zgodne z Payment Link / Price w Stripe.',
                    condition: (data) => data?.pricing === 'paid',
                    width: '50%',
                  },
                },
                {
                  name: 'currency',
                  type: 'select',
                  defaultValue: 'pln',
                  options: [
                    { label: 'PLN', value: 'pln' },
                    { label: 'EUR', value: 'eur' },
                    { label: 'USD', value: 'usd' },
                  ],
                  admin: {
                    condition: (data) => data?.pricing === 'paid',
                    width: '50%',
                  },
                },
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
            {
              name: 'landing',
              type: 'blocks',
              label: 'Landing kursu (sekcje)',
              blocks: [CourseRichText, CourseVideo, CourseImage, CourseCallout],
              admin: {
                initCollapsed: true,
                description:
                  'Sekcje strony sprzedażowej kursu — pokazywane pod nagłówkiem, nad sylabusem.',
              },
            },
          ],
        },
        {
          label: 'Sylabus',
          fields: [
            {
              name: 'phases',
              type: 'array',
              labels: { singular: 'Faza', plural: 'Fazy' },
              fields: [
                {
                  name: 'letter',
                  type: 'text',
                  required: true,
                  label: 'Litera fazy',
                  admin: { description: 'np. A, B, C' },
                },
                { name: 'name', type: 'text', required: true, localized: true },
                { name: 'hint', type: 'textarea', localized: true },
              ],
            },
            {
              name: 'outcomes',
              type: 'array',
              labels: { singular: 'Efekt', plural: 'Efekty' },
              fields: [
                { name: 'title', type: 'text', required: true, localized: true },
                { name: 'body', type: 'textarea', localized: true },
              ],
            },
            {
              name: 'audience',
              type: 'array',
              labels: { singular: 'Dla kogo', plural: 'Dla kogo' },
              fields: [{ name: 'item', type: 'text', required: true, localized: true }],
            },
            {
              name: 'requirements',
              type: 'array',
              labels: { singular: 'Wymaganie', plural: 'Czego potrzebujesz' },
              fields: [{ name: 'item', type: 'text', required: true, localized: true }],
            },
            {
              name: 'level',
              type: 'select',
              options: [
                { label: 'Początkujący', value: 'beginner' },
                { label: 'Średniozaawansowany', value: 'intermediate' },
                { label: 'Zaawansowany', value: 'advanced' },
              ],
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
