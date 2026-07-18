import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'
import { ownOrAdmin } from '../access/ownOrAdmin'

export const CourseMeasurements: CollectionConfig = {
  slug: 'course-measurements',
  access: { read: ownOrAdmin, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: { useAsTitle: 'point', defaultColumns: ['user', 'program', 'point', 'recordedAt'] },
  indexes: [{ fields: ['user', 'program', 'point'], unique: true }],
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'program', type: 'relationship', relationTo: 'program', required: true, index: true },
    { name: 'point', type: 'text', required: true }, // klucz z measurementPoints, np. 'D0'
    { name: 'values', type: 'json' }, // metryka -> liczba, wg measurementMetrics
    { name: 'recordedAt', type: 'date' },
  ],
}
