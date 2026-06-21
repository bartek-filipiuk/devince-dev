import type { Product } from '@/payload-types'

/**
 * Deterministic hue (0–359) from a string, so each product gets a distinct but
 * stable gradient for its placeholder cover. Simple FNV-ish hash — not for
 * security, just to spread hues.
 */
export function hueFromString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % 360
}

/** First visible character of the title, uppercased — the placeholder monogram. */
export function monogram(title: string): string {
  const ch = (title.trim()[0] ?? '?').toUpperCase()
  return ch
}

/** Concatenated text of a Lexical node and its descendants. */
function lexicalNodeText(node: unknown): string {
  const n = node as { text?: unknown; children?: unknown[] }
  if (typeof n.text === 'string') return n.text
  if (Array.isArray(n.children)) return n.children.map(lexicalNodeText).join('')
  return ''
}

/**
 * The plain text of the first non-empty block in a Lexical rich-text value —
 * used as the storefront card tagline (the description's opening line is the
 * product's headline). Returns null for empty/absent content. CSS clamps it to
 * two lines on the card.
 */
export function firstLineFromLexical(rt: unknown): string | null {
  const root = (rt as { root?: { children?: unknown[] } } | null)?.root
  if (!root || !Array.isArray(root.children)) return null
  for (const node of root.children) {
    const text = lexicalNodeText(node).trim()
    if (text) return text
  }
  return null
}

type Tier = NonNullable<Product['tiers']>[number]

/**
 * The cheapest tier of a product (by priceCents), or null when the product is
 * not tiered. Used to show a "from <price>" label on the storefront card.
 * Products are fetched at the page locale, so a tier's priceCents/currency are
 * already the locale values.
 */
export function cheapestTier(product: Pick<Product, 'tiers'>): Tier | null {
  const tiers = Array.isArray(product.tiers) ? product.tiers : []
  if (tiers.length === 0) return null
  return tiers.reduce((min, t) => (t.priceCents < min.priceCents ? t : min), tiers[0])
}
