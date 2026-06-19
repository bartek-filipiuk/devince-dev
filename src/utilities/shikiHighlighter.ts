import {
  createHighlighter,
  type Highlighter,
  type BundledLanguage,
} from 'shiki'
import {
  transformerNotationHighlight,
  transformerNotationDiff,
  transformerNotationFocus,
} from '@shikijs/transformers'

// Theme decision: `github-dark` (built-in, warm dark, pairs with the gold
// accents). Swappable in one place.
const THEME = 'github-dark'
// Languages the lesson CodeBlock select offers (+ a few common extras).
const LANGS: BundledLanguage[] = [
  'typescript',
  'javascript',
  'tsx',
  'jsx',
  'python',
  'bash',
  'json',
  'css',
  'html',
  'php',
  'sql',
  'markdown',
]

// Module-level singleton: createHighlighter loads the wasm + themes/langs once
// and is reused for every code block across every request.
let highlighterPromise: Promise<Highlighter> | null = null
function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({ themes: [THEME], langs: LANGS })
  }
  return highlighterPromise
}

export async function highlightCode(code: string, lang?: string): Promise<string> {
  const hl = await getHighlighter()
  const loaded = hl.getLoadedLanguages()
  const language = lang && loaded.includes(lang as BundledLanguage) ? lang : 'text'
  return hl.codeToHtml(code, {
    lang: language as BundledLanguage,
    theme: THEME,
    transformers: [
      transformerNotationHighlight(),
      transformerNotationDiff(),
      transformerNotationFocus(),
    ],
  })
}
