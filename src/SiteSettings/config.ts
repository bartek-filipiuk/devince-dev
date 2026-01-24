import type { GlobalConfig } from 'payload'

import { revalidateSiteSettings } from './hooks/revalidateSiteSettings'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: {
    read: () => true,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'General',
          fields: [
            {
              name: 'siteName',
              type: 'text',
              required: true,
              label: 'Site Name',
            },
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
              label: 'Site Logo',
            },
          ],
        },
        {
          label: 'Contact',
          fields: [
            {
              name: 'contact',
              type: 'group',
              fields: [
                {
                  name: 'email',
                  type: 'email',
                  label: 'Email Address',
                },
                {
                  name: 'phone',
                  type: 'text',
                  label: 'Phone Number',
                },
                {
                  name: 'address',
                  type: 'group',
                  label: 'Address',
                  fields: [
                    {
                      name: 'street',
                      type: 'text',
                      label: 'Street Address',
                    },
                    {
                      type: 'row',
                      fields: [
                        {
                          name: 'city',
                          type: 'text',
                          label: 'City',
                          admin: {
                            width: '50%',
                          },
                        },
                        {
                          name: 'postalCode',
                          type: 'text',
                          label: 'Postal Code',
                          admin: {
                            width: '50%',
                          },
                        },
                      ],
                    },
                    {
                      name: 'country',
                      type: 'text',
                      label: 'Country',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Social Media',
          fields: [
            {
              name: 'socialLinks',
              type: 'array',
              label: 'Social Links',
              labels: {
                singular: 'Social Link',
                plural: 'Social Links',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'platform',
                      type: 'select',
                      required: true,
                      options: [
                        { label: 'Facebook', value: 'facebook' },
                        { label: 'Twitter / X', value: 'twitter' },
                        { label: 'Instagram', value: 'instagram' },
                        { label: 'LinkedIn', value: 'linkedin' },
                        { label: 'YouTube', value: 'youtube' },
                        { label: 'Discord', value: 'discord' },
                        { label: 'GitHub', value: 'github' },
                        { label: 'TikTok', value: 'tiktok' },
                      ],
                      admin: {
                        width: '30%',
                      },
                    },
                    {
                      name: 'url',
                      type: 'text',
                      required: true,
                      label: 'URL',
                      admin: {
                        width: '70%',
                      },
                    },
                  ],
                },
              ],
              admin: {
                initCollapsed: true,
              },
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateSiteSettings],
  },
}
