import type { CollectionConfig } from 'payload'
import { adminOnly } from '../access/adminOnly'
import { ownOrAdmin } from '../access/ownOrAdmin'

// Klucze MCP uczestnika: w DB wyłącznie hash SHA-256 + prefix; plaintext widzi
// tylko właściciel, raz, w odpowiedzi POST /api/courses/agent-keys.
export const AgentApiKeys: CollectionConfig = {
  slug: 'agent-api-keys',
  access: { read: ownOrAdmin, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: { useAsTitle: 'name', defaultColumns: ['user', 'name', 'keyPrefix', 'revokedAt'] },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'name', type: 'text', required: true },
    { name: 'keyPrefix', type: 'text', required: true },
    { name: 'keyHash', type: 'text', required: true, unique: true, index: true },
    { name: 'lastUsedAt', type: 'date' },
    { name: 'revokedAt', type: 'date' },
  ],
}
