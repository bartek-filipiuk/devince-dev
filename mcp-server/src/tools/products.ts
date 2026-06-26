import { z } from 'zod/v4'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ApiClient } from '../lib/api-client.js'
import {
  localeSchema,
  statusSchema,
  contentFormatSchema,
  contentResult,
  errorResult,
} from '../lib/tool-helpers.js'

const createProductSchema = z.object({
  title: z.string().describe('Product title'),
  priceCents: z.number().describe('Price in minor units, e.g. 4900 = 49.00'),
  currency: z.string().optional().describe('e.g. PLN, USD'),
  description: z.string().optional().describe('markdown'),
  coverImage: z.number().optional().describe('Media id from upload_media'),
  downloadFiles: z.array(z.number()).optional().describe('app-asset ids the buyer downloads'),
  stripePriceId: z.string().optional().describe('Stripe price ID'),
  _status: statusSchema.optional().describe('Publication status (default: draft)'),
  contentFormat: contentFormatSchema,
  locale: localeSchema,
})

const updateProductSchema = z.object({
  idOrSlug: z.string().describe('Product ID (numeric) or slug to update'),
  title: z.string().optional().describe('Product title'),
  priceCents: z.number().optional().describe('Price in minor units, e.g. 4900 = 49.00'),
  currency: z.string().optional().describe('e.g. PLN, USD'),
  description: z.string().optional().describe('markdown'),
  coverImage: z.number().optional().describe('Media id from upload_media'),
  downloadFiles: z.array(z.number()).optional().describe('app-asset ids the buyer downloads'),
  stripePriceId: z.string().optional().describe('Stripe price ID'),
  tiers: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Per-locale price tiers (PATCH-only)'),
  screenshots: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('image + caption (PATCH-only)'),
  _status: statusSchema.optional().describe('Publication status'),
  contentFormat: contentFormatSchema,
  locale: localeSchema,
})

export function registerProductTools(server: McpServer, api: ApiClient, baseUrl: string): void {
  server.registerTool(
    'create_product',
    {
      title: 'Create Product',
      description:
        'Create a new apps-store product on devince.dev. Set price in minor units (priceCents). Description should be in markdown format. Products are created as drafts by default.',
      inputSchema: createProductSchema,
    },
    async (input) => {
      try {
        const { locale, ...body } = input
        const res = await api.createProduct(body, locale)
        return contentResult(res, 'product', 'created', baseUrl, 'products')
      } catch (err) {
        return errorResult(`Error creating product: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  server.registerTool(
    'update_product',
    {
      title: 'Update Product',
      description:
        'Update an existing apps-store product by ID or slug. Only include fields you want to change. Supports per-locale price tiers and screenshots (PATCH-only).',
      inputSchema: updateProductSchema,
    },
    async (input) => {
      try {
        const { idOrSlug, locale, ...body } = input
        const res = await api.updateProduct(idOrSlug, body, locale)
        return contentResult(res, 'product', 'updated', baseUrl, 'products')
      } catch (err) {
        return errorResult(`Error updating product: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )
}
