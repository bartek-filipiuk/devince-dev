import { describe, it, expect } from 'vitest'
import { ingestChangelogFragments, type PayloadLike } from './changelogIngest'
import type { Fragment } from '@/changelog/fragments'

/**
 * Stateful Payload stub modelling a localized global: notes hold per-locale text,
 * updateGlobal reconciles the array by id (preserving the other locale's text), and
 * duplicate incoming ids throw like Payload's "Value must be unique" — so the two-pass
 * pl/en write is exercised realistically (findGlobal('en') sees rows created in the
 * pl pass, which is where the real bug lived).
 */
type Note = { id: string; tag: string; text: { pl?: string; en?: string } }
type Entry = { id: string; date: string; sourceId?: string | null; notes: Note[] }

function statefulPayload(seed: Entry[] = []) {
  let entries: Entry[] = seed.map((e) => ({ ...e, notes: e.notes.map((n) => ({ ...n })) }))
  let counter = 0
  const project = (locale: 'pl' | 'en') => ({
    entries: entries.map((e) => ({
      id: e.id,
      date: e.date,
      sourceId: e.sourceId,
      notes: e.notes.map((n) => ({ id: n.id, tag: n.tag, text: n.text[locale] ?? '' })),
    })) as never,
  })
  const payload: PayloadLike = {
    findGlobal: async ({ locale }) => project(locale),
    updateGlobal: async ({ locale, data }) => {
      const ids = data.entries.map((e) => e.id).filter(Boolean)
      if (new Set(ids).size !== ids.length) throw new Error('ValidationError: Value must be unique: id')
      const byId = new Map(entries.map((e) => [e.id, e]))
      entries = data.entries.map((inE) => {
        const existing = inE.id ? byId.get(inE.id) : undefined
        return {
          id: inE.id ?? `e${counter++}`,
          date: inE.date,
          sourceId: inE.sourceId,
          notes: inE.notes.map((inN, j) => {
            const exN = existing?.notes?.[j]
            return {
              id: inN.id ?? exN?.id ?? `n${counter++}`,
              tag: inN.tag,
              text: { ...(exN?.text ?? {}), [locale]: inN.text },
            }
          }),
        }
      })
      return project(locale)
    },
  }
  return { payload, getState: () => entries }
}

const frag = (id: string): Fragment => ({
  id,
  date: '2026-06-25',
  notes: [{ tag: 'apps', pl: `pl-${id}`, en: `en-${id}` }],
})

const seededEntry = (id: string): Entry => ({
  id: `seed-${id}`,
  date: '2026-06-20',
  sourceId: id,
  notes: [{ id: `seed-${id}-n`, tag: 'platform', text: { pl: `old-pl-${id}`, en: `old-en-${id}` } }],
})

describe('ingestChangelogFragments', () => {
  it('no-ops when all fragments are already ingested', async () => {
    const { payload, getState } = statefulPayload([seededEntry('a')])
    const res = await ingestChangelogFragments({ payload, fragments: [frag('a')] })
    expect(res.ingested).toEqual([])
    expect(getState()).toHaveLength(1)
  })

  it('ingests a new fragment with BOTH pl and en text (no duplicate id)', async () => {
    const { payload, getState } = statefulPayload([])
    const res = await ingestChangelogFragments({ payload, fragments: [frag('a')] })

    expect(res.ingested).toEqual(['a'])
    const state = getState()
    expect(state).toHaveLength(1)
    expect(state[0].sourceId).toBe('a')
    expect(state[0].notes[0].text).toEqual({ pl: 'pl-a', en: 'en-a' })
  })

  it('ingests only new fragments and preserves existing entries’ en text', async () => {
    const { payload, getState } = statefulPayload([seededEntry('a')])
    const res = await ingestChangelogFragments({ payload, fragments: [frag('a'), frag('b'), frag('c')] })

    expect(res.ingested).toEqual(['b', 'c'])
    const state = getState()
    expect(state.map((e) => e.sourceId)).toEqual(['a', 'b', 'c'])
    // pre-existing entry keeps both locales intact
    expect(state[0].notes[0].text).toEqual({ pl: 'old-pl-a', en: 'old-en-a' })
    // new entries have both locales
    expect(state[1].notes[0].text).toEqual({ pl: 'pl-b', en: 'en-b' })
    expect(state[2].notes[0].text).toEqual({ pl: 'pl-c', en: 'en-c' })
  })

  it('defaults to the repo fragments when none are injected', async () => {
    const { payload } = statefulPayload([])
    const res = await ingestChangelogFragments({ payload })
    expect(res.ingested).toContain('2026-06-25-public-changelog')
  })
})
