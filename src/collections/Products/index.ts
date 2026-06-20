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
            {
              // Access model. 'paid' = normal Stripe checkout (default).
              // 'lead-magnet' = FREE in exchange for a double-opted-in email:
              // the storefront swaps the buy button for an email-capture form,
              // and /api/free-claim grants access on DOI confirmation. The
              // free-claim + confirm routes re-check this value server-side from
              // the DB record — the client can never make a paid item free.
              name: 'accessMode',
              type: 'select',
              // Not `required` so existing/seeded products need not set it — the
              // defaultValue applies and any null is treated as 'paid' by the
              // free-claim/confirm guards (fail-safe to PAID, never to free).
              defaultValue: 'paid',
              options: [
                { label: 'Płatny (Stripe)', value: 'paid' },
                { label: 'Lead magnet (darmowy za e-mail)', value: 'lead-magnet' },
              ],
              admin: {
                description:
                  'Płatny = checkout Stripe. Lead magnet = darmowy za zapis na listę (double opt-in); cena ignorowana.',
                position: 'sidebar',
              },
            },
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
            {
              name: 'tiers',
              type: 'array',
              label:
                'Poziomy cenowe (opcjonalne — gdy ustawione, strona produktu pokazuje selektor licencji zamiast pojedynczej ceny)',
              labels: { singular: 'Poziom', plural: 'Poziomy' },
              fields: [
                {
                  name: 'name',
                  type: 'text',
                  required: true,
                  admin: { description: 'Np. "Starter", "Pro", "Agency"' },
                },
                {
                  name: 'priceCents',
                  type: 'number',
                  required: true,
                  min: 0,
                  localized: true,
                  admin: { description: 'Cena w groszach/centach (np. 4900 = 49,00). Niezależna per język (PL/EN).' },
                },
                {
                  name: 'currency',
                  type: 'select',
                  defaultValue: 'usd',
                  localized: true,
                  options: [
                    { label: 'USD', value: 'usd' },
                    { label: 'EUR', value: 'eur' },
                    { label: 'PLN', value: 'pln' },
                  ],
                },
                {
                  name: 'tagline',
                  type: 'text',
                  localized: true,
                  admin: { description: 'Np. "1 projekt", "Do 5 projektów"' },
                },
                {
                  name: 'features',
                  type: 'array',
                  localized: true,
                  labels: { singular: 'Cecha', plural: 'Cechy' },
                  fields: [{ name: 'item', type: 'text', required: true }],
                },
                {
                  name: 'recommended',
                  type: 'checkbox',
                  admin: { description: 'Oznacz ten poziom jako polecany (wyróżnienie na stronie)' },
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
