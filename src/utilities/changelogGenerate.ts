import { selectChangelogPRs, type PR } from './changelogSelect.js'
import { summarizeChangelog, type Note, type Tag } from './changelogSummarize.js'
import type { CompareResult } from './githubCompare.js'

/**
 * Orchestrates one auto-changelog run: read the last covered sha, pull the PRs
 * merged since, filter + summarize them, and append a single localized entry to
 * the `changelog` global. Idempotent on the stored HEAD sha, and a no-op when
 * nothing user-facing changed. All IO is injectable so the logic is unit-tested
 * without GitHub, Claude, or a database.
 *
 * The localized `notes[].text` is written in two passes (pl then en) carrying the
 * ids minted in the first pass, so neither locale clobbers the other — the same
 * recipe the external roadmap API uses, extended to the nested notes array.
 */
export type NoteRow = { id?: string | null; tag: Tag; text: string }
export type EntryRow = {
  id?: string | null
  date: string
  toSha?: string | null
  prRefs?: { number?: number | null; id?: string | null }[] | null
  notes: NoteRow[]
}
export type GlobalDoc = { entries?: EntryRow[] | null }

export type PayloadLike = {
  findGlobal(args: {
    slug: 'changelog'
    locale: 'pl' | 'en'
    depth: number
    overrideAccess: boolean
  }): Promise<GlobalDoc>
  updateGlobal(args: {
    slug: 'changelog'
    locale: 'pl' | 'en'
    data: { entries: EntryRow[] }
    overrideAccess: boolean
  }): Promise<GlobalDoc>
}

export type GenerateDeps = {
  payload: PayloadLike
  fetchCompare: (lastSha: string) => Promise<CompareResult>
  fetchPullsForCommit: (sha: string) => Promise<PR[]>
  summarize?: (prs: ReturnType<typeof selectChangelogPRs>) => Promise<Note[]>
  /** First-run base sha (CHANGELOG_SEED_SHA) when the global has no entries yet. */
  seedSha?: string
  now?: () => Date
}

export type GenerateResult = { created: boolean; entryId?: string; prCount: number; notes: Note[] }

const NOOP = (notes: Note[] = []): GenerateResult => ({ created: false, prCount: 0, notes })

function newestToSha(entries: EntryRow[]): string {
  if (entries.length === 0) return ''
  const newest = entries.reduce((a, b) => (new Date(b.date).getTime() > new Date(a.date).getTime() ? b : a))
  return newest.toSha ?? ''
}

function dedupeByNumber(prs: PR[]): PR[] {
  const seen = new Set<number>()
  const out: PR[] = []
  for (const p of prs) {
    if (!seen.has(p.number)) {
      seen.add(p.number)
      out.push(p)
    }
  }
  return out
}

export async function runChangelogGenerate(deps: GenerateDeps): Promise<GenerateResult> {
  const summarize = deps.summarize ?? summarizeChangelog
  const now = deps.now ?? (() => new Date())

  const plDoc = await deps.payload.findGlobal({ slug: 'changelog', locale: 'pl', depth: 0, overrideAccess: true })
  const plEntries = plDoc.entries ?? []

  const lastSha = newestToSha(plEntries) || deps.seedSha || ''
  if (!lastSha) return NOOP()

  const compare = await deps.fetchCompare(lastSha)
  if (!compare.headSha || compare.headSha === lastSha) return NOOP()

  const pulls = (await Promise.all(compare.commits.map((c) => deps.fetchPullsForCommit(c.sha)))).flat()
  const selected = selectChangelogPRs(dedupeByNumber(pulls))
  if (selected.length === 0) return NOOP()

  const notes = await summarize(selected)
  if (notes.length === 0) return NOOP()

  const date = now().toISOString()
  const prRefs = selected.map((p) => ({ number: p.number }))

  // Pass 1 (pl): append the new entry, capture the ids Payload mints.
  const plRes = await deps.payload.updateGlobal({
    slug: 'changelog',
    locale: 'pl',
    data: {
      entries: [...plEntries, { date, toSha: compare.headSha, prRefs, notes: notes.map((n) => ({ tag: n.tag, text: n.pl })) }],
    },
    overrideAccess: true,
  })
  const minted = (plRes.entries ?? []).at(-1)

  // Pass 2 (en): re-read en entries (preserves their en text via their own ids),
  // append the same new entry carrying the minted entry + note ids with en text.
  const enDoc = await deps.payload.findGlobal({ slug: 'changelog', locale: 'en', depth: 0, overrideAccess: true })
  const enEntries = enDoc.entries ?? []
  await deps.payload.updateGlobal({
    slug: 'changelog',
    locale: 'en',
    data: {
      entries: [
        ...enEntries,
        {
          id: minted?.id ?? undefined,
          date,
          toSha: compare.headSha,
          prRefs: minted?.prRefs ?? prRefs,
          notes: notes.map((n, i) => ({ id: minted?.notes?.[i]?.id ?? undefined, tag: n.tag, text: n.en })),
        },
      ],
    },
    overrideAccess: true,
  })

  return { created: true, entryId: minted?.id ?? undefined, prCount: selected.length, notes }
}
