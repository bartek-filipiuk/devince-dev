import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'

import { adminOnly } from '../../access/adminOnly'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

/**
 * Purchasable digital products served from apps.devince.dev.
 *
 * Read access is published-or-authenticated by design (public storefront).
 * All writes are admin-only.
 * `downloadFiles` relationship IDs are exposed at depth 0 — this is harmless
 * because the `app-assets` collection enforces admin-only read and file access;
 * the only delivery path is the grant-gated /api/apps/download/[token] route.
 */
export const Products: CollectionConfig = {
  slug: 'products',
  access: {
    read: authenticatedOrPublished,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'priceCents', '_status'] },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Produkt',
          fields: [
            { name: 'description', type: 'richText', localized: true },
            { name: 'coverImage', type: 'upload', relationTo: 'media' },
            {
              type: 'row',
              fields: [
                {
                  name: 'priceCents',
                  type: 'number',
                  required: true,
                  min: 0,
                  admin: { description: 'Cena w groszach (np. 4900 = 49,00 zł)' },
                },
                {
                  name: 'currency',
                  type: 'select',
                  required: true,
                  defaultValue: 'pln',
                  options: [
                    { label: 'PLN', value: 'pln' },
                    { label: 'EUR', value: 'eur' },
                    { label: 'USD', value: 'usd' },
                  ],
                },
              ],
            },
            {
              name: 'stripePriceId',
              type: 'text',
              admin: { description: 'Opcjonalnie: istniejący Stripe Price. Gdy puste, Checkout używa price_data z priceCents.' },
            },
            {
              name: 'downloadFiles',
              type: 'relationship',
              relationTo: 'app-assets',
              hasMany: true,
              admin: { description: 'Prywatne pliki dostarczane po zakupie.' },
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
            // hasGenerateFn disabled: generateURL in seoPlugin builds main-domain URLs, wrong for apps.devince.dev
            MetaTitleField({
              hasGenerateFn: false,
            }),
            MetaImageField({
              relationTo: 'media',
            }),
            MetaDescriptionField({}),
            PreviewField({
              hasGenerateFn: false,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    slugField(),
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeChange: [populatePublishedAt],
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
