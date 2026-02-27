import { z } from 'zod/v4'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ApiClient, MediaData, ApiResponse } from '../lib/api-client.js'
import { textResult, errorResult } from '../lib/tool-helpers.js'

const uploadMediaSchema = z.object({
  imageUrl: z.string().optional().describe('URL of the image to download and upload (preferred over base64)'),
  base64: z.string().optional().describe('Base64-encoded image data (use only if imageUrl is not available)'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']).optional().describe('MIME type of the base64 image (required when using base64)'),
  alt: z.string().optional().describe('Alt text for the image'),
})

function formatMediaResult(res: ApiResponse<MediaData>, baseUrl: string) {
  if (res.error) {
    return errorResult(`Error uploading media: [${res.error.code}] ${res.error.message}`)
  }
  if (!res.data) {
    return errorResult('Error uploading media: unexpected empty response from API')
  }
  const d = res.data
  const dimensions = d.width && d.height ? `${d.width}x${d.height}` : 'N/A (vector)'
  return textResult([
    'Media uploaded successfully.',
    `  ID: ${d.id} (use this ID for heroImage in posts/projects)`,
    `  Filename: ${d.filename}`,
    `  URL: ${baseUrl}${d.url}`,
    `  Dimensions: ${dimensions}`,
    `  Type: ${d.mimeType}`,
  ].join('\n'))
}

export function registerMediaTools(server: McpServer, api: ApiClient, baseUrl: string): void {
  server.registerTool(
    'upload_media',
    {
      title: 'Upload Media',
      description: 'Upload an image to devince.dev media library. Provide either imageUrl (preferred) to fetch and upload an image from a URL, or base64 + mimeType to upload raw image data. Returns a media ID to use as heroImage in create_post/create_project. Max 10MB, supports JPEG/PNG/WebP/GIF/SVG.',
      inputSchema: uploadMediaSchema,
    },
    async (input) => {
      try {
        if (!input.imageUrl && !input.base64) {
          return errorResult('Error: provide either imageUrl or base64 + mimeType')
        }

        if (input.base64 && !input.mimeType) {
          return errorResult('Error: mimeType is required when using base64')
        }

        const source = input.imageUrl
          ? { imageUrl: input.imageUrl }
          : { base64: input.base64!, mimeType: input.mimeType! }

        const res = await api.uploadMedia(source, input.alt)
        return formatMediaResult(res, baseUrl)
      } catch (err) {
        return errorResult(`Error uploading media: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )
}
