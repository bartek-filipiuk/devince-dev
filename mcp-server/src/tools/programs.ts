import { z } from 'zod/v4'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ApiClient } from '../lib/api-client.js'
import {
  metaSchema,
  localeSchema,
  statusSchema,
  contentResult,
  errorResult,
} from '../lib/tool-helpers.js'

const createProgramSchema = z.object({
  title: z.string().describe('Program title'),
  type: z.enum(['course', 'workshop', 'event']).describe('Program type'),
  heroHeadline: z.string().optional().describe('Hero section headline'),
  heroDescription: z.string().optional().describe('Hero section description'),
  heroImage: z.number().optional().describe('Media ID from upload_media tool'),
  startDate: z.string().optional().describe('Start date (ISO 8601)'),
  endDate: z.string().optional().describe('End date (ISO 8601)'),
  format: z.enum(['online', 'physical', 'hybrid']).optional().describe('Event format'),
  onlineLink: z.string().optional().describe('Online meeting URL'),
  locationName: z.string().optional().describe('Physical location name'),
  locationAddress: z.string().optional().describe('Physical location address'),
  pricing: z.enum(['free', 'paid']).optional().describe('Pricing model'),
  duration: z.string().optional().describe('Duration (e.g. "8 weeks", "~3 hours")'),
  ctaLabel: z.string().optional().describe('CTA button text'),
  ctaUrl: z.string().optional().describe('CTA button URL'),
  meta: metaSchema.optional().describe('SEO metadata'),
  _status: statusSchema.optional().describe('Publication status (default: draft)'),
  publishedAt: z.string().optional().describe('ISO 8601 publish date'),
  locale: localeSchema,
})

const updateProgramSchema = z.object({
  idOrSlug: z.string().describe('Program ID (numeric) or slug to update'),
  title: z.string().optional().describe('Program title'),
  type: z.enum(['course', 'workshop', 'event']).optional().describe('Program type'),
  heroHeadline: z.string().optional().describe('Hero section headline'),
  heroDescription: z.string().optional().describe('Hero section description'),
  heroImage: z.number().optional().describe('Media ID from upload_media tool'),
  startDate: z.string().optional().describe('Start date (ISO 8601)'),
  endDate: z.string().optional().describe('End date (ISO 8601)'),
  format: z.enum(['online', 'physical', 'hybrid']).optional().describe('Event format'),
  onlineLink: z.string().optional().describe('Online meeting URL'),
  locationName: z.string().optional().describe('Physical location name'),
  locationAddress: z.string().optional().describe('Physical location address'),
  pricing: z.enum(['free', 'paid']).optional().describe('Pricing model'),
  duration: z.string().optional().describe('Duration (e.g. "8 weeks", "~3 hours")'),
  ctaLabel: z.string().optional().describe('CTA button text'),
  ctaUrl: z.string().optional().describe('CTA button URL'),
  meta: metaSchema.optional().describe('SEO metadata'),
  _status: statusSchema.optional().describe('Publication status'),
  publishedAt: z.string().optional().describe('ISO 8601 publish date'),
  locale: localeSchema,
})

export function registerProgramTools(server: McpServer, api: ApiClient, baseUrl: string): void {
  server.registerTool(
    'create_program',
    {
      title: 'Create Program',
      description:
        'Create a new program (course, workshop, or event) on devince.dev. Sets metadata and hero section. Layout blocks should be added via the admin panel. Programs are created as drafts by default.',
      inputSchema: createProgramSchema,
    },
    async (input) => {
      try {
        const { locale, ...body } = input
        const res = await api.createProgram(body, locale)
        return contentResult(res, 'program', 'created', baseUrl, 'program')
      } catch (err) {
        return errorResult(`Error creating program: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  server.registerTool(
    'update_program',
    {
      title: 'Update Program',
      description:
        'Update an existing program (course, workshop, or event) by ID or slug. Only include fields you want to change.',
      inputSchema: updateProgramSchema,
    },
    async (input) => {
      try {
        const { idOrSlug, locale, ...body } = input
        const res = await api.updateProgram(idOrSlug, body, locale)
        return contentResult(res, 'program', 'updated', baseUrl, 'program')
      } catch (err) {
        return errorResult(`Error updating program: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )
}
