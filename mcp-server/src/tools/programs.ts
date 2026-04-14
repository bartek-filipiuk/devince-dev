import { z } from 'zod/v4'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ApiClient } from '../lib/api-client.js'
import {
  metaSchema,
  localeSchema,
  statusSchema,
  contentResult,
  textResult,
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

const setProgramLayoutSchema = z.object({
  idOrSlug: z.string().describe('Program ID (numeric) or slug'),
  layout: z
    .array(z.record(z.string(), z.unknown()))
    .describe(
      `Array of layout blocks. Each block needs a "blockType" field. Rich text fields accept markdown strings (auto-converted to Lexical).

Available block types:

content — Rich text columns:
  { "blockType": "content", "columns": [{ "size": "full|half|oneThird|twoThirds", "richText": "## Markdown\\n\\nText..." }] }

features — Feature grid with icons:
  { "blockType": "features", "sectionTitle": "...", "sectionDescription": "...", "features": [{ "icon": "code|book|users|star|globe|heart|lightning|calendar", "title": "...", "description": "..." }] }

cta — Call to action:
  { "blockType": "cta", "richText": "## Markdown CTA text", "links": [{ "link": { "type": "custom", "url": "...", "label": "...", "appearance": "default|outline" } }] }

brevoSignup — Email signup form:
  { "blockType": "brevoSignup", "listId": "...", "headline": "...", "description": "markdown", "buttonText": "...", "successMessage": "...", "privacyLink": "/privacy" }

testimonials — Customer quotes:
  { "blockType": "testimonials", "sectionTitle": "...", "testimonials": [{ "quote": "...", "author": "...", "role": "...", "rating": 5 }] }

glassHero — Hero section:
  { "blockType": "glassHero", "headline": "...", "subheadline": "markdown", "primaryCTA": { "type": "custom", "url": "...", "label": "...", "appearance": "default" } }

contactCTA — Contact section:
  { "blockType": "contactCTA", "headline": "...", "description": "markdown", "contactEmail": "...", "primaryCTA": { ... } }

mediaBlock — Single media:
  { "blockType": "mediaBlock", "media": <mediaId> }`,
    ),
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

  server.registerTool(
    'set_program_layout',
    {
      title: 'Set Program Layout',
      description:
        'Set the layout blocks for a program page. Replaces the entire layout. Rich text fields (richText, subheadline, description, introContent) accept markdown strings which are auto-converted to Lexical format. Use after create_program to build the full page content.',
      inputSchema: setProgramLayoutSchema,
    },
    async (input) => {
      try {
        const { idOrSlug, layout, locale } = input
        const res = await api.setProgramLayout(idOrSlug, layout, locale)
        if (res.error) {
          return errorResult(`Error setting layout: [${res.error.code}] ${res.error.message}`)
        }
        const d = res.data as Record<string, unknown> | undefined
        if (!d) {
          return errorResult('Error setting layout: unexpected empty response from API')
        }
        return textResult(
          [
            'Program layout set successfully.',
            `  ID: ${d.id}`,
            `  Title: ${d.title}`,
            `  Blocks: ${d.blocksCount}`,
            `  Admin: ${baseUrl}/admin/collections/program/${d.id}`,
          ].join('\n'),
        )
      } catch (err) {
        return errorResult(`Error setting layout: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )
}
