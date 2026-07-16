import { z } from 'zod/v4'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ApiClient } from '../lib/api-client.js'
import { localeSchema, textResult, errorResult } from '../lib/tool-helpers.js'

const listContentSchema = z.object({
  resource: z.enum(['programs', 'lessons', 'products', 'posts', 'projects', 'media', 'app-assets']),
  page: z.number().optional(),
  limit: z.number().optional().describe('max 100'),
  slug: z.string().optional(),
  status: z.string().optional(),
  depth: z.number().optional(),
  locale: localeSchema,
})

const getContentSchema = z.object({
  resource: z.enum(['programs', 'lessons', 'products', 'posts', 'projects']),
  idOrSlug: z.string(),
  depth: z.number().optional().describe('0-2, default 1'),
  locale: localeSchema,
})

export function registerReadTools(server: McpServer, api: ApiClient, baseUrl: string): void {
  server.registerTool(
    'get_manifest',
    {
      title: 'Get Manifest',
      description:
        'Fetch the self-describing manifest of the content API (resources, methods, fields, enums, conventions). Call this first to learn what you can create and read.',
      inputSchema: z.object({}),
    },
    async () => {
      const res = await api.getManifest()
      if (res.error) return errorResult(`Error fetching manifest: [${res.error.code}] ${res.error.message}`)
      return textResult(JSON.stringify(res.data, null, 2))
    },
  )

  server.registerTool(
    'list_content',
    {
      title: 'List Content',
      description:
        'List content of a given resource (programs, lessons, products, posts, projects, media, app-assets). Supports pagination and filtering.',
      inputSchema: listContentSchema,
    },
    async (input) => {
      const { resource, locale, ...query } = input
      const res = await api.listContent(resource, query, locale)
      if (res.error) return errorResult(`Error listing ${resource}: [${res.error.code}] ${res.error.message}`)
      return textResult(JSON.stringify(res.data, null, 2))
    },
  )

  server.registerTool(
    'get_content',
    {
      title: 'Get Content',
      description:
        'Fetch a single content item (program, lesson, product, post, project) by ID or slug. Use to read/verify content you created.',
      inputSchema: getContentSchema,
    },
    async (input) => {
      const { resource, idOrSlug, locale, ...query } = input
      const res = await api.getContent(resource, idOrSlug, query, locale)
      if (res.error) return errorResult(`Error fetching ${resource}: [${res.error.code}] ${res.error.message}`)
      return textResult(JSON.stringify(res.data, null, 2))
    },
  )
}
