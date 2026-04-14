import {
  convertMarkdownToLexical,
  defaultEditorConfig,
  BlocksFeature,
  sanitizeServerEditorConfig,
  type SanitizedServerEditorConfig,
} from '@payloadcms/richtext-lexical'
import { CodeBlock } from '@payloadcms/richtext-lexical'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

let editorConfigPromise: Promise<SanitizedServerEditorConfig> | null = null

function getEditorConfig(): Promise<SanitizedServerEditorConfig> {
  if (!editorConfigPromise) {
    editorConfigPromise = (async () => {
      try {
        const payload = await getPayload({ config: configPromise })
        const config = {
          ...defaultEditorConfig,
          features: [...defaultEditorConfig.features, BlocksFeature({ blocks: [CodeBlock()] })],
        }
        return await sanitizeServerEditorConfig(config, payload.config)
      } catch (error) {
        editorConfigPromise = null
        throw error
      }
    })()
  }
  return editorConfigPromise
}

export async function markdownToLexical(markdown: string) {
  const editorConfig = await getEditorConfig()
  return convertMarkdownToLexical({ editorConfig, markdown })
}

const RICH_TEXT_FIELDS: Record<string, string[]> = {
  cta: ['richText'],
  glassHero: ['subheadline'],
  contactCTA: ['description'],
  brevoSignup: ['description'],
  archive: ['introContent'],
  formBlock: ['introContent'],
}

export async function convertBlocksMarkdown(
  blocks: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  return Promise.all(blocks.map(async (block) => convertBlock(block)))
}

async function convertBlock(block: Record<string, unknown>): Promise<Record<string, unknown>> {
  const blockType = block.blockType as string

  // Content block has nested columns with richText
  if (blockType === 'content' && Array.isArray(block.columns)) {
    return {
      ...block,
      columns: await Promise.all(
        (block.columns as Record<string, unknown>[]).map(async (col) => ({
          ...col,
          richText: await maybeConvert(col.richText),
        })),
      ),
    }
  }

  const fields = RICH_TEXT_FIELDS[blockType]
  if (!fields) return block

  const converted = { ...block }
  for (const field of fields) {
    if (field in converted) {
      converted[field] = await maybeConvert(converted[field])
    }
  }
  return converted
}

async function maybeConvert(value: unknown): Promise<unknown> {
  if (typeof value === 'string') return markdownToLexical(value)
  return value
}
