import { uniqueSlug } from './slugify'

export type LessonHeading = { id: string; text: string; level: 2 | 3 }

function nodeText(node: any): string {
  if (!node) return ''
  if (Array.isArray(node.children)) return node.children.map(nodeText).join('')
  if (typeof node.text === 'string') return node.text
  return ''
}

/** Walks a Lexical editor state's top-level children for h2/h3 headings. */
export function extractHeadings(content: unknown): LessonHeading[] {
  const root = (content as any)?.root
  const children: any[] = Array.isArray(root?.children) ? root.children : []
  const out: LessonHeading[] = []
  const seen = new Map<string, number>()
  for (const node of children) {
    if (node?.type !== 'heading') continue
    if (node.tag !== 'h2' && node.tag !== 'h3') continue
    const text = nodeText(node).trim()
    if (!text) continue
    out.push({ id: uniqueSlug(text, seen), text, level: node.tag === 'h2' ? 2 : 3 })
  }
  return out
}
