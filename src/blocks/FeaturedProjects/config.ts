import type { Block } from 'payload'

export const FeaturedProjects: Block = {
  slug: 'featuredProjects',
  interfaceName: 'FeaturedProjectsBlock',
  fields: [
    {
      name: 'sectionTitle',
      type: 'text',
      label: 'Section Title',
      defaultValue: 'Projekty',
      localized: true,
    },
    {
      name: 'sectionDescription',
      type: 'text',
      label: 'Section Description',
      localized: true,
    },
    {
      name: 'limit',
      type: 'number',
      label: 'Number of Projects',
      defaultValue: 3,
      min: 1,
      max: 6,
      admin: {
        description: 'How many projects to display',
      },
    },
    {
      name: 'ctaLabel',
      type: 'text',
      label: 'CTA Button Label',
      defaultValue: 'Zobacz wszystkie',
      localized: true,
    },
    {
      name: 'ctaUrl',
      type: 'text',
      label: 'CTA Button URL',
      defaultValue: '/projects',
    },
  ],
  labels: {
    plural: 'Featured Projects Sections',
    singular: 'Featured Projects Section',
  },
}
