import type { SelectedPR } from './changelogSelect.js'

/**
 * Turns selected PRs into short, public, bilingual changelog notes using Claude
 * (`claude-opus-4-8`) with a structured-output JSON schema. Security PRs are
 * phrased generically (never naming the vuln/vector/version). Any model failure
 * or refusal falls back to title-derived notes so an entry is still produced.
 *
 * The Anthropic client is injectable (`deps.client`) for tests; in production a
 * real client is constructed lazily so `ANTHROPIC_API_KEY` is only required at
 * call time.
 */
export type Tag = 'apps' | 'courses' | 'platform' | 'security'
export type Note = { tag: Tag; pl: string; en: string }

const TAGS: Tag[] = ['apps', 'courses', 'platform', 'security']
const MAX_NOTES = 5

export type AnthropicLike = {
  messages: {
    create(args: unknown): Promise<{
      stop_reason: string | null
      content: Array<{ type: string; text?: string }>
    }>
  }
}

export type SummarizeDeps = { client?: AnthropicLike }

const NOTES_SCHEMA = {
  type: 'object',
  properties: {
    notes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tag: { type: 'string', enum: TAGS },
          pl: { type: 'string' },
          en: { type: 'string' },
        },
        required: ['tag', 'pl', 'en'],
        additionalProperties: false,
      },
    },
  },
  required: ['notes'],
  additionalProperties: false,
} as const

const SECURITY_NOTE: Note = {
  tag: 'security',
  pl: 'Bezpieczeństwo: aktualizacje i łatki podatności',
  en: 'Security: dependency updates and vulnerability patches',
}

function buildPrompt(prs: SelectedPR[]): string {
  const lines = prs.map((p) => {
    const sec = p.isSecurity ? '[SECURITY] ' : ''
    const body = (p.body || '').slice(0, 500).trim()
    return `- #${p.number} ${sec}${p.title}${body ? `\n  ${body.replace(/\n+/g, ' ')}` : ''}`
  })
  return [
    'You write the PUBLIC changelog for the devince.dev apps + courses platform.',
    'Summarize the merged pull requests below into AT MOST 5 short notes, one line each:',
    'describe WHAT changed and briefly WHY, in plain user-facing language — no file names, no internal jargon.',
    'For each note choose a tag (apps | courses | platform | security) and write it in Polish (pl) and English (en).',
    'For PRs marked [SECURITY] write a GENERIC note (e.g. "Bezpieczeństwo: aktualizacje i łatki podatności" / "Security: dependency updates and vulnerability patches") —',
    'NEVER name the vulnerability, attack vector, CVE, or dependency version.',
    'Merge trivial changes; prefer fewer, clearer notes.',
    '',
    'Pull requests:',
    ...lines,
  ].join('\n')
}

function cleanTitle(title: string): string {
  const stripped = title.replace(/^\w+(\(.+?\))?[:!]\s*/, '').trim()
  return stripped.length > 0 ? stripped[0].toUpperCase() + stripped.slice(1) : title
}

function inferTag(pr: SelectedPR): Tag {
  if (pr.isSecurity) return 'security'
  const hay = `${pr.title} ${pr.labels.join(' ')}`.toLowerCase()
  if (/\bapps?\b/.test(hay)) return 'apps'
  if (/course|kurs|lesson|lekcj/.test(hay)) return 'courses'
  return 'platform'
}

function fallbackNotes(prs: SelectedPR[]): Note[] {
  return prs.slice(0, MAX_NOTES).map((pr) => {
    if (pr.isSecurity) return SECURITY_NOTE
    const text = cleanTitle(pr.title)
    return { tag: inferTag(pr), pl: text, en: text }
  })
}

function isValidNote(n: unknown): n is Note {
  const note = n as Note
  return (
    !!note &&
    TAGS.includes(note.tag) &&
    typeof note.pl === 'string' &&
    note.pl.length > 0 &&
    typeof note.en === 'string' &&
    note.en.length > 0
  )
}

async function getClient(injected?: AnthropicLike): Promise<AnthropicLike> {
  if (injected) return injected
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  return new Anthropic() as unknown as AnthropicLike
}

export async function summarizeChangelog(
  prs: SelectedPR[],
  deps: SummarizeDeps = {},
): Promise<Note[]> {
  if (prs.length === 0) return []

  try {
    const client = await getClient(deps.client)
    const res = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      output_config: { format: { type: 'json_schema', name: 'changelog_notes', schema: NOTES_SCHEMA } },
      messages: [{ role: 'user', content: buildPrompt(prs) }],
    })

    if (res.stop_reason === 'refusal') return fallbackNotes(prs)

    const text = res.content.find((b) => b.type === 'text')?.text
    if (!text) return fallbackNotes(prs)

    const parsed = JSON.parse(text) as { notes?: unknown }
    const notes = Array.isArray(parsed.notes) ? parsed.notes.filter(isValidNote) : []
    if (notes.length === 0) return fallbackNotes(prs)
    return notes.slice(0, MAX_NOTES)
  } catch {
    return fallbackNotes(prs)
  }
}
