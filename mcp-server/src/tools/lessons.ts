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

const createLessonSchema = z.object({
  title: z.string().describe('Lesson title'),
  program: z.string().describe('Program id or slug the lesson belongs to'),
  body: z.string().optional().describe('Lesson content (markdown)'),
  order: z.number().optional().describe('Lesson order within the program'),
  isFree: z.boolean().optional().describe('Free preview lesson'),
  duration: z.string().optional().describe('Lesson duration (e.g. "12 min")'),
  dependencies: z.array(z.number()).optional().describe('Lesson ids that must be completed first'),
  _status: statusSchema.optional().describe('Publication status (NOTE: lessons default to published)'),
  contentFormat: contentFormatSchema,
  locale: localeSchema,
})

const updateLessonSchema = z.object({
  idOrSlug: z.string().describe('Lesson ID (numeric) or slug to update'),
  title: z.string().optional().describe('Lesson title'),
  program: z.string().optional().describe('Program id or slug the lesson belongs to'),
  body: z.string().optional().describe('Lesson content (markdown)'),
  order: z.number().optional().describe('Lesson order within the program'),
  isFree: z.boolean().optional().describe('Free preview lesson'),
  duration: z.string().optional().describe('Lesson duration (e.g. "12 min")'),
  dependencies: z.array(z.number()).optional().describe('Lesson ids that must be completed first'),
  _status: statusSchema.optional().describe('Publication status (NOTE: lessons default to published)'),
  contentFormat: contentFormatSchema,
  locale: localeSchema,
})

export function registerLessonTools(server: McpServer, api: ApiClient, baseUrl: string): void {
  server.registerTool(
    'create_lesson',
    {
      title: 'Create Lesson',
      description:
        'Create a new lesson within a program (course) on devince.dev. Body should be in markdown format. NOTE: lessons default to published (not draft).',
      inputSchema: createLessonSchema,
    },
    async (input) => {
      try {
        const { locale, ...body } = input
        const res = await api.createLesson(body, locale)
        return contentResult(res, 'lesson', 'created', baseUrl, 'lessons')
      } catch (err) {
        return errorResult(`Error creating lesson: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )

  server.registerTool(
    'update_lesson',
    {
      title: 'Update Lesson',
      description: 'Update an existing lesson by ID or slug. Only include fields you want to change.',
      inputSchema: updateLessonSchema,
    },
    async (input) => {
      try {
        const { idOrSlug, locale, ...body } = input
        const res = await api.updateLesson(idOrSlug, body, locale)
        return contentResult(res, 'lesson', 'updated', baseUrl, 'lessons')
      } catch (err) {
        return errorResult(`Error updating lesson: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )
}
