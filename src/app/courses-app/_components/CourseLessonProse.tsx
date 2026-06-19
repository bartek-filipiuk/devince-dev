import type { DefaultTypedEditorState, SerializedLinkNode } from '@payloadcms/richtext-lexical'
import {
  RichText as ConvertRichText,
  type JSXConvertersFunction,
  LinkJSXConverter,
} from '@payloadcms/richtext-lexical/react'
import { uniqueSlug } from '@/utilities/slugify'
import { type Locale } from '@/i18n'
import { ShikiCode } from './ShikiCode'

const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
  const doc = linkNode.fields.doc
  if (!doc || typeof doc.value !== 'object') return '/'
  const slug = (doc.value as { slug?: string }).slug
  return doc.relationTo === 'posts' ? `/posts/${slug}` : `/${slug}`
}

function headingText(node: any): string {
  if (!node) return ''
  if (Array.isArray(node.children)) return node.children.map(headingText).join('')
  if (typeof node.text === 'string') return node.text
  return ''
}

/**
 * Renders the lesson `content` (Lexical) for the courses theme. Overrides the
 * heading converter (anchor ids via the SAME uniqueSlug sequence as
 * extractHeadings, so TOC links resolve) and the code-block converter (Shiki).
 * Built per-render so the dedup `seen` map is fresh each time.
 */
export function CourseLessonProse({ content, locale }: {
  content: DefaultTypedEditorState
  locale: Locale
}) {
  const seen = new Map<string, number>()

  const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    ...LinkJSXConverter({ internalDocToHref }),
    heading: ({ node, nodesToJSX }: any) => {
      const Tag = node.tag as 'h2' | 'h3' | 'h4'
      const children = nodesToJSX({ nodes: node.children })
      if (Tag === 'h2' || Tag === 'h3') {
        const id = uniqueSlug(headingText(node).trim(), seen)
        return (
          <Tag id={id} className="ct-anchor">
            {children}
            <a href={`#${id}`} className="ct-anchor__link" aria-hidden="true" tabIndex={-1}>
              #
            </a>
          </Tag>
        )
      }
      return <Tag>{children}</Tag>
    },
    blocks: {
      code: ({ node }: any) => (
        <ShikiCode code={node.fields.code} lang={node.fields.language} locale={locale} />
      ),
      Code: ({ node }: any) => (
        <ShikiCode code={node.fields.code} lang={node.fields.language} locale={locale} />
      ),
    },
  })

  return (
    <div className="course-prose lprose">
      <ConvertRichText data={content} converters={converters} />
    </div>
  )
}
