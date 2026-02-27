import { z } from 'zod/v4'
import type { ApiResponse, ContentData } from './api-client.js'

export const metaSchema = z.object({
  title: z.string().optional().describe('SEO title'),
  description: z.string().optional().describe('SEO description'),
  image: z.number().optional().describe('Media ID for OG image'),
})

export const localeSchema = z.enum(['pl', 'en']).optional().describe('Content locale (default: pl)')

export const statusSchema = z.enum(['draft', 'published'])

export const contentFormatSchema = z.enum(['markdown', 'lexical']).optional().describe('Content format (default: markdown)')

export function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] }
}

export function errorResult(text: string) {
  return { content: [{ type: 'text' as const, text }], isError: true as const }
}

export function contentResult(res: ApiResponse<ContentData>, collection: string, action: string, baseUrl: string) {
  const text = formatContentResult(res, collection, action, baseUrl)
  if (res.error) return errorResult(text)
  return textResult(text)
}

export function formatContentResult(
  res: ApiResponse<ContentData>,
  collection: string,
  action: string,
  baseUrl: string,
): string {
  if (res.error) {
    return `Error ${action} ${collection}: [${res.error.code}] ${res.error.message}`
  }
  if (!res.data) {
    return `Error ${action} ${collection}: unexpected empty response from API`
  }
  const d = res.data
  return [
    `${capitalize(collection)} ${action} successfully.`,
    `  ID: ${d.id}`,
    `  Title: ${d.title}`,
    `  Slug: ${d.slug}`,
    `  Status: ${d._status}`,
    `  Admin: ${baseUrl}/admin/collections/${collection}s/${d.id}`,
  ].join('\n')
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
