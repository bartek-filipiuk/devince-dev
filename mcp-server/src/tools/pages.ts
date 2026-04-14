import { z } from 'zod/v4'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ApiClient } from '../lib/api-client.js'
import { localeSchema, textResult, errorResult } from '../lib/tool-helpers.js'

const setPageLayoutSchema = z.object({
  idOrSlug: z.string().describe('Page ID (numeric) or slug (e.g. "home")'),
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

glassHero — Hero section:
  { "blockType": "glassHero", "headline": "...", "subheadline": "markdown", "primaryCTA": { "type": "custom", "url": "...", "label": "...", "appearance": "default" }, "secondaryCTA": { ... } }

featuredProjects — Project showcase (Pages only):
  { "blockType": "featuredProjects", "sectionTitle": "...", "sectionDescription": "...", "ctaLabel": "...", "ctaUrl": "..." }

contactCTA — Contact section:
  { "blockType": "contactCTA", "headline": "...", "description": "markdown", "contactEmail": "...", "primaryCTA": { ... }, "socialLinks": [{ "platform": "github|linkedin|twitter|...", "url": "..." }] }

brevoSignup — Email signup form:
  { "blockType": "brevoSignup", "listId": "...", "headline": "...", "description": "markdown", "buttonText": "..." }

testimonials — Customer quotes:
  { "blockType": "testimonials", "testimonials": [{ "quote": "...", "author": "...", "role": "...", "rating": 5 }] }

mediaBlock — Single media:
  { "blockType": "mediaBlock", "media": <mediaId> }`,
    ),
  locale: localeSchema,
})

export function registerPageTools(server: McpServer, api: ApiClient, baseUrl: string): void {
  server.registerTool(
    'set_page_layout',
    {
      title: 'Set Page Layout',
      description:
        'Set the layout blocks for a CMS page (e.g. homepage). Replaces the entire layout. Rich text fields accept markdown strings (auto-converted to Lexical). Use slug "home" for the homepage.',
      inputSchema: setPageLayoutSchema,
    },
    async (input) => {
      try {
        const { idOrSlug, layout, locale } = input
        const res = await api.setPageLayout(idOrSlug, layout, locale)
        if (res.error) {
          return errorResult(`Error setting layout: [${res.error.code}] ${res.error.message}`)
        }
        const d = res.data as Record<string, unknown> | undefined
        if (!d) {
          return errorResult('Error setting layout: unexpected empty response from API')
        }
        return textResult(
          [
            'Page layout set successfully.',
            `  ID: ${d.id}`,
            `  Title: ${d.title}`,
            `  Slug: ${d.slug}`,
            `  Blocks: ${d.blocksCount}`,
            `  Admin: ${baseUrl}/admin/collections/pages/${d.id}`,
          ].join('\n'),
        )
      } catch (err) {
        return errorResult(`Error setting layout: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
  )
}
