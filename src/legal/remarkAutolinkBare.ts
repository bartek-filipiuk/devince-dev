import { visit } from 'unist-util-visit'
import type { Root, Text, PhrasingContent } from 'mdast'

/**
 * remark plugin: linkify bare domains and email addresses that appear as plain
 * text in the legal documents (e.g. **polubowne.uokik.gov.pl**, bartek@devince.dev).
 *
 * remark-gfm only autolinks protocol/`www.`-prefixed URLs; the legal source
 * keeps domains as bare bold text (which must not be edited), so we turn those
 * occurrences into real <a> links here instead.
 */

// Bare domain (e.g. polubowne.uokik.gov.pl, apps.devince.dev) or email.
const PATTERN =
  /([a-z0-9](?:[a-z0-9-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z]{2,})+)|((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})/gi

export function remarkAutolinkBare() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === null || index === undefined) return
      // Don't relink text that is already inside a link.
      if (parent.type === 'link') return

      const value = node.value
      PATTERN.lastIndex = 0
      if (!PATTERN.test(value)) return

      PATTERN.lastIndex = 0
      const children: PhrasingContent[] = []
      let last = 0
      let match: RegExpExecArray | null

      while ((match = PATTERN.exec(value)) !== null) {
        const [full, email] = match
        const start = match.index
        if (start > last) {
          children.push({ type: 'text', value: value.slice(last, start) })
        }
        const url = email ? `mailto:${full}` : `https://${full}`
        children.push({
          type: 'link',
          url,
          children: [{ type: 'text', value: full }],
        } as PhrasingContent)
        last = start + full.length
      }

      if (last < value.length) {
        children.push({ type: 'text', value: value.slice(last) })
      }

      parent.children.splice(index, 1, ...children)
      // Skip the nodes we just inserted.
      return index + children.length
    })
  }
}
