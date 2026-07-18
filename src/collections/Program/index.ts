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
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      label: 'Polecany',
      admin: {
        position: 'sidebar',
        description: 'Przypięty na górze listy kursów (storefront), niezależnie od postępu użytkownika.',
      },
    },
    {
      name: 'deliveryMode',
      type: 'select',
      defaultValue: 'self-paced',
      options: [
        { label: 'Własne tempo', value: 'self-paced' },
        { label: 'Kohortowy (dzienny drip)', value: 'cohort' },
      ],
      admin: { position: 'sidebar' },
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
              // Access model, independent of `pricing` (which only drives the
              // paid-checkout UI). 'paid' = normal Stripe checkout (default).
              // 'lead-magnet' = FREE in exchange for a double-opted-in email:
              // the syllabus/cards swap the buy button for an email-capture
              // form, and /api/free-claim grants access on DOI confirmation.
              // The free-claim + confirm routes re-check this from the DB —
              // the client can never make a paid course free; price is ignored.
              name: 'accessMode',
              type: 'select',
              label: 'Model dostępu',
              // Not `required` so existing/seeded programs need not set it — the
              // defaultValue applies and any null is treated as 'paid' by the
              // free-claim/confirm guards (fail-safe to PAID, never to free).
              defaultValue: 'paid',
              options: [
                { label: 'Płatny (Stripe)', value: 'paid' },
                { label: 'Lead magnet (darmowy za e-mail)', value: 'lead-magnet' },
              ],
              admin: {
                description:
                  'Lead magnet = darmowy dostęp za zapis na listę (double opt-in); cena ignorowana.',
                position: 'sidebar',
              },
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
          label: 'Kohorta',
          admin: { condition: (data) => data?.deliveryMode === 'cohort' },
          fields: [
            {
              name: 'cohortConfig',
              type: 'group',
              fields: [
                {
                  name: 'programLength',
                  type: 'number',
                  min: 1,
                  // required: true w grupie czyni cały cohortConfig wymaganym w
                  // wygenerowanych typach (psuje create programów self-paced);
                  // wymagalność tylko dla trybu kohortowego egzekwuje validate.
                  validate: (value: unknown, { data }: { data: unknown }) => {
                    const mode = (data as { deliveryMode?: string } | undefined)?.deliveryMode
                    if (mode !== 'cohort') return true
                    return (typeof value === 'number' && value >= 1) || 'Wymagane dla trybu kohortowego'
                  },
                  admin: { description: 'Liczba dni programu (dzień lekcji = pole nr)' },
                },
                { name: 'unlockHour', type: 'number', defaultValue: 6, min: 0, max: 23 },
                { name: 'timezone', type: 'text', defaultValue: 'Europe/Warsaw' },
                {
                  name: 'minimumLabel',
                  type: 'text',
                  localized: true,
                  admin: {
                    description: 'Etykieta wbudowanego pola minimum, np. "Zrobiłem minimum"',
                  },
                },
                {
                  name: 'checkinFields',
                  type: 'array',
                  admin: {
                    description:
                      'Dodatkowe pola dziennego check-inu (minimum + notatka są wbudowane)',
                  },
                  fields: [
                    { name: 'key', type: 'text', required: true },
                    { name: 'label', type: 'text', required: true, localized: true },
                    {
                      name: 'fieldType',
                      type: 'select',
                      required: true,
                      defaultValue: 'number',
                      options: [
                        { label: 'Tak/nie', value: 'boolean' },
                        { label: 'Liczba', value: 'number' },
                        { label: 'Wybór', value: 'select' },
                        { label: 'Tekst', value: 'text' },
                      ],
                    },
                    { name: 'min', type: 'number', admin: { condition: (_, s) => s?.fieldType === 'number' } },
                    { name: 'max', type: 'number', admin: { condition: (_, s) => s?.fieldType === 'number' } },
                    {
                      name: 'options',
                      type: 'array',
                      admin: { condition: (_, s) => s?.fieldType === 'select' },
                      fields: [
                        { name: 'value', type: 'text', required: true },
                        { name: 'label', type: 'text', required: true, localized: true },
                      ],
                    },
                    {
                      name: 'section',
                      type: 'text',
                      localized: true,
                      admin: { description: 'Nagłówek sekcji formularza (opcjonalny)' },
                    },
                  ],
                },
                {
                  name: 'measurementPoints',
                  type: 'array',
                  fields: [
                    { name: 'key', type: 'text', required: true },
                    { name: 'label', type: 'text', required: true, localized: true },
                  ],
                },
                {
                  name: 'measurementMetrics',
                  type: 'array',
                  fields: [
                    { name: 'key', type: 'text', required: true },
                    { name: 'label', type: 'text', required: true, localized: true },
                    { name: 'unit', type: 'text' },
                    { name: 'min', type: 'number' },
                    { name: 'max', type: 'number' },
                  ],
                },
                {
                  name: 'completion',
                  type: 'group',
                  fields: [
                    {
                      name: 'minimumDaysTarget',
                      type: 'number',
                      admin: { description: 'Ile dni z minimum = ukończenie (np. 48)' },
                    },
                    {
                      name: 'extraTargets',
                      type: 'array',
                      fields: [
                        { name: 'label', type: 'text', localized: true },
                        {
                          name: 'fieldKey',
                          type: 'text',
                          required: true,
                          admin: { description: 'Klucz pola z checkinFields' },
                        },
                        { name: 'matchValues', type: 'text', hasMany: true, required: true },
                        { name: 'target', type: 'number', required: true },
                      ],
                    },
                  ],
                },
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
