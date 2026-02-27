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

const createProjectSchema = z.object({
  title: z.string().describe('Project title'),
  description: z.string().describe('Project description in markdown format'),
  contentFormat: contentFormatSchema,
  heroImage: z.number().optional().describe('Media ID from upload_media tool'),
  technologies: z.array(z.string()).optional().describe('Technology names, e.g. ["Next.js", "TypeScript"]'),
  githubUrl: z.string().optional().describe('GitHub repository URL'),
  productionUrl: z.string().optional().describe('Live production URL'),
  meta: metaSchema.optional().describe('SEO metadata'),
  _status: statusSchema.optional().describe('Publication status (default: draft)'),
  publishedAt: z.string().optional().describe('ISO 8601 publish date'),
  locale: localeSchema,
})

const updateProjectSchema = z.object({
  idOrSlug: z.string().describe('Project ID (numeric) or slug to update'),
  title: z.string().optional().describe('Project title'),
  description: z.string().optional().describe('Project description in markdown format'),
  contentFormat: contentFormatSchema,
  heroImage: z.number().optional().describe('Media ID from upload_media tool'),
  technologies: z.array(z.string()).optional().describe('Technology names'),
  githubUrl: z.string().optional().describe('GitHub repository URL'),
  productionUrl: z.string().optional().describe('Live production URL'),
  meta: metaSchema.optional().describe('SEO metadata'),
  _status: statusSchema.optional().describe('Publication status'),
  publishedAt: z.string().optional().describe('ISO 8601 publish date'),
  locale: localeSchema,
})

export function registerProjectTools(server: McpServer, api: ApiClient, baseUrl: string): void {
  server.registerTool(
    'create_project',
    {
      title: 'Create Project',
      description: 'Create a new portfolio project on devince.dev. Include technologies, GitHub URL, and production URL. Projects are created as drafts by default.',
      inputSchema: createProjectSchema,
    },
    async (input) => {
      try {
        const { locale, ...body } = input
        const res = await api.createProject(body, locale)
        return contentResult(res, 'project', 'created', baseUrl)
      } catch (err) {
        return errorResult(`Error creating project: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  server.registerTool(
    'update_project',
    {
      title: 'Update Project',
      description: 'Update an existing portfolio project by ID or slug. Only include fields you want to change.',
      inputSchema: updateProjectSchema,
    },
    async (input) => {
      try {
        const { idOrSlug, locale, ...body } = input
        const res = await api.updateProject(idOrSlug, body, locale)
        return contentResult(res, 'project', 'updated', baseUrl)
      } catch (err) {
        return errorResult(`Error updating project: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )
}
