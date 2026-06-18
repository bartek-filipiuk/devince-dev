import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'
import { adminOnly } from '../../access/adminOnly'
import { enrolledOrAdmin } from '../../access/enrolledOrAdmin'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'

export const Lessons: CollectionConfig = {
  slug: 'lessons',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: enrolledOrAdmin,
    update: adminOnly,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'program', 'phase', 'order'],
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'program', type: 'relationship', relationTo: 'program', required: true },
    { name: 'phase', type: 'text', label: 'Faza' },
    { name: 'order', type: 'number', defaultValue: 0, label: 'Kolejność' },
    { name: 'nr', type: 'number', label: 'Numer etapu' },
    { name: 'phaseId', type: 'text', label: 'ID fazy (A–I)' },
    { name: 'hardGate', type: 'checkbox', label: 'Hard gate (nieskippowalny)' },
    { name: 'hybrid', type: 'checkbox', label: 'Hybrydowy / IRL' },
    {
      name: 'kind',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: 'Normalny', value: 'normal' },
        { label: 'Decyzja', value: 'decision' },
      ],
    },
    {
      name: 'estTimeMin',
      type: 'group',
      label: 'Szac. czas (min)',
      fields: [
        { name: 'min', type: 'number' },
        { name: 'max', type: 'number' },
      ],
    },
    { name: 'why', type: 'textarea', label: 'Po co (why)', localized: true },
    { name: 'what', type: 'textarea', label: 'Co robisz (what)', localized: true },
    { name: 'dod', type: 'textarea', label: 'Definition of Done', localized: true },
    {
      name: 'skills',
      type: 'array',
      labels: { singular: 'Skill', plural: 'Skille' },
      fields: [{ name: 'skill', type: 'text', required: true }],
    },
    {
      name: 'dependencies',
      type: 'relationship',
      relationTo: 'lessons',
      hasMany: true,
      label: 'Wymagane wcześniej',
    },
    {
      name: 'type',
      type: 'select',
      defaultValue: 'text',
      options: [
        { label: 'Tekst', value: 'text' },
        { label: 'Embed', value: 'embed' },
        { label: 'Wideo', value: 'video' },
        { label: 'Do pobrania', value: 'download' },
      ],
    },
    { name: 'content', type: 'richText', localized: true },
    { name: 'youtubeEmbedUrl', type: 'text', label: 'YouTube embed (pomoc, opcjonalne)' },
    {
      name: 'downloadFile',
      type: 'upload',
      // Private upload collection (not publicly served). Served only through the
      // enrollment-gated /api/course/download/[id] route, which streams bytes.
      relationTo: 'course-assets',
      admin: { condition: (d) => d?.type === 'download' },
    },
    { name: 'publishedAt', type: 'date', admin: { position: 'sidebar' } },
    slugField(),
  ],
  hooks: { beforeChange: [populatePublishedAt] },
  versions: { drafts: { autosave: { interval: 100 } }, maxPerDoc: 20 },
}
