import { fragments as defaultFragments, type Fragment, type Tag } from '@/changelog/fragments'

/**
 * Copies not-yet-published changelog fragments into the `changelog` Payload global.
 * Idempotent on each fragment's `id` (stored as the entry's `sourceId`), so it can
 * run on every boot. Localized note text is written in two passes (pl then en)
 * carrying the ids minted in the first pass, so neither locale clobbers the other —
 * the same recipe the external roadmap/changelog API uses, applied to the nested
 * notes array. Payload is injectable so the logic is unit-tested without a database.
 */
export type NoteRow = { id?: string | null; tag: Tag; text: string }
export type EntryRow = { id?: string | null; date: string; sourceId?: string | null; notes: NoteRow[] }
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

export type IngestDeps = { payload: PayloadLike; fragments?: Fragment[] }

export async function ingestChangelogFragments(deps: IngestDeps): Promise<{ ingested: string[] }> {
  const fragments = deps.fragments ?? defaultFragments

  const plDoc = await deps.payload.findGlobal({ slug: 'changelog', locale: 'pl', depth: 0, overrideAccess: true })
  const plEntries = plDoc.entries ?? []
  const have = new Set(plEntries.map((e) => e.sourceId).filter((s): s is string => !!s))

  const fresh = fragments.filter((f) => !have.has(f.id))
  if (fresh.length === 0) return { ingested: [] }

  // Pass 1 (pl): append the new entries, capture the ids Payload mints.
  const plRes = await deps.payload.updateGlobal({
    slug: 'changelog',
    locale: 'pl',
    data: {
      entries: [
        ...plEntries,
        ...fresh.map((f) => ({ date: f.date, sourceId: f.id, notes: f.notes.map((n) => ({ tag: n.tag, text: n.pl })) })),
      ],
    },
    overrideAccess: true,
  })
  const all = plRes.entries ?? [] // full set, every row now carries an id

  // Pass 2 (en): UPDATE the same rows by id (do NOT append — the rows already exist
  // after pass 1, so re-adding them collides on id). New rows take the fragment's en
  // text; pre-existing rows keep their own en text (read from the en locale).
  const enDoc = await deps.payload.findGlobal({ slug: 'changelog', locale: 'en', depth: 0, overrideAccess: true })
  const enById = new Map((enDoc.entries ?? []).map((e) => [e.id, e] as const))
  const freshBySource = new Map(fresh.map((f) => [f.id, f] as const))

  await deps.payload.updateGlobal({
    slug: 'changelog',
    locale: 'en',
    data: {
      entries: all.map((entry) => {
        const f = entry.sourceId ? freshBySource.get(entry.sourceId) : undefined
        const existingEn = entry.id ? enById.get(entry.id) : undefined
        return {
          id: entry.id,
          date: entry.date,
          sourceId: entry.sourceId,
          notes: entry.notes.map((note, j) => ({
            id: note.id,
            tag: note.tag,
            text: f ? (f.notes[j]?.en ?? note.text) : (existingEn?.notes?.[j]?.text ?? note.text),
          })),
        }
      }),
    },
    overrideAccess: true,
  })

  return { ingested: fresh.map((f) => f.id) }
}
