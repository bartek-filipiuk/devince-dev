import {
  convertMarkdownToLexical,
  defaultEditorConfig,
  sanitizeServerEditorConfig,
  type SanitizedServerEditorConfig,
} from '@payloadcms/richtext-lexical'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

let editorConfigPromise: Promise<SanitizedServerEditorConfig> | null = null

function getEditorConfig(): Promise<SanitizedServerEditorConfig> {
  if (!editorConfigPromise) {
    editorConfigPromise = (async () => {
      try {
        const payload = await getPayload({ config: configPromise })
        return await sanitizeServerEditorConfig(defaultEditorConfig, payload.config)
      } catch (error) {
        editorConfigPromise = null // Allow retry on failure
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
