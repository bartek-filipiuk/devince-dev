import { z } from 'zod/v4'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ApiClient } from '../lib/api-client.js'
import {
  metaSchema,
  localeSchema,
  statusSchema,
  contentFormatSchema,
  contentResult,
  errorResult,
} from '../lib/tool-helpers.js'

const createPostSchema = z.object({
  title: z.string().describe('Post title'),
  content: z.string().describe('Post content in markdown format'),
  contentFormat: contentFormatSchema,
  heroImage: z.number().optional().describe('Media ID from upload_media tool'),
  categories: z.array(z.union([z.string(), z.number()])).optional().describe('Category names (auto-created) or IDs'),
  meta: metaSchema.optional().describe('SEO metadata'),
  _status: statusSchema.optional().describe('Publication status (default: draft)'),
  publishedAt: z.string().optional().describe('ISO 8601 publish date'),
  authors: z.array(z.number()).optional().describe('User IDs'),
  locale: localeSchema,
})

const updatePostSchema = z.object({
  idOrSlug: z.string().describe('Post ID (numeric) or slug to update'),
  title: z.string().optional().describe('Post title'),
  content: z.string().optional().describe('Post content in markdown format'),
  contentFormat: contentFormatSchema,
  heroImage: z.number().optional().describe('Media ID from upload_media tool'),
  categories: z.array(z.union([z.string(), z.number()])).optional().describe('Category names or IDs'),
  meta: metaSchema.optional().describe('SEO metadata'),
  _status: statusSchema.optional().describe('Publication status'),
  publishedAt: z.string().optional().describe('ISO 8601 publish date'),
  authors: z.array(z.number()).optional().describe('User IDs'),
  locale: localeSchema,
})

export function registerPostTools(server: McpServer, api: ApiClient, baseUrl: string): void {
  server.registerTool(
    'create_post',
    {
      title: 'Create Post',
      description: 'Create a new blog post on devince.dev. Content should be in markdown format. Posts are created as drafts by default.',
      inputSchema: createPostSchema,
    },
    async (input) => {
      try {
        const { locale, ...body } = input
        const res = await api.createPost(body, locale)
        return contentResult(res, 'post', 'created', baseUrl)
      } catch (err) {
        return errorResult(`Error creating post: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  server.registerTool(
    'update_post',
    {
      title: 'Update Post',
      description: 'Update an existing blog post by ID or slug. Only include fields you want to change. Use this to publish drafts by setting _status to "published".',
      inputSchema: updatePostSchema,
    },
    async (input) => {
      try {
        const { idOrSlug, locale, ...body } = input
        const res = await api.updatePost(idOrSlug, body, locale)
        return contentResult(res, 'post', 'updated', baseUrl)
      } catch (err) {
        return errorResult(`Error updating post: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )
}
