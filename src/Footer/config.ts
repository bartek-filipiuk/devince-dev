import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateFooter } from './hooks/revalidateFooter'

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: {
    read: () => true,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Navigation',
          fields: [
            {
              name: 'navItems',
              type: 'array',
              fields: [
                link({
                  appearances: false,
                }),
              ],
              maxRows: 6,
              admin: {
                initCollapsed: true,
                components: {
                  RowLabel: '@/Footer/RowLabel#RowLabel',
                },
              },
            },
          ],
        },
        {
          label: 'Display Options',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'showSocialLinks',
                  type: 'checkbox',
                  defaultValue: true,
                  label: 'Show Social Links',
                  admin: {
                    description: 'Display social media links from Site Settings',
                    width: '33%',
                  },
                },
                {
                  name: 'showContactInfo',
                  type: 'checkbox',
                  defaultValue: true,
                  label: 'Show Contact Info',
                  admin: {
                    description: 'Display contact information from Site Settings',
                    width: '33%',
                  },
                },
                {
                  name: 'showNewsletter',
                  type: 'checkbox',
                  defaultValue: true,
                  label: 'Show Newsletter',
                  admin: {
                    description: 'Display newsletter signup form',
                    width: '33%',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Newsletter',
          admin: {
            condition: (data) => data.showNewsletter,
          },
          fields: [
            {
              name: 'newsletterTitle',
              type: 'text',
              label: 'Newsletter Title',
              defaultValue: 'Subscribe to our newsletter',
            },
            {
              name: 'newsletterDescription',
              type: 'textarea',
              label: 'Newsletter Description',
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateFooter],
  },
}
