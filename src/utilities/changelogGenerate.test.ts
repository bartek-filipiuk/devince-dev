import { describe, it, expect, vi } from 'vitest'
import { runChangelogGenerate, type GenerateDeps, type PayloadLike } from './changelogGenerate'
import type { PR } from './changelogSelect'
import type { Note } from './changelogSummarize'

const pr = (over: Partial<PR>): PR => ({ number: 1, title: '', body: '', labels: [], ...over })

// A Payload stub that records updateGlobal calls and assigns synthetic ids.
function payloadStub(initialEntries: Record<'pl' | 'en', unknown[]>): {
  payload: PayloadLike
  updates: { locale: string; entries: unknown[] }[]
} {
  const updates: { locale: string; entries: unknown[] }[] = []
  const payload: PayloadLike = {
    findGlobal: async ({ locale }) => ({ entries: initialEntries[locale] as never }),
    updateGlobal: async ({ locale, data }) => {
      updates.push({ locale, entries: data.entries })
      // assign ids to entries/notes that lack them (mimics Payload)
      const withIds = data.entries.map((e, i) => ({
        ...e,
        id: e.id ?? `entry-${i}`,
        notes: e.notes.map((n, j) => ({ ...n, id: n.id ?? `note-${i}-${j}` })),
      }))
      return { entries: withIds as never }
    },
  }
  return { payload, updates }
}

const baseDeps = (over: Partial<GenerateDeps>): GenerateDeps => ({
  payload: payloadStub({ pl: [], en: [] }).payload,
  fetchCompare: async () => ({ headSha: '', commits: [] }),
  fetchPullsForCommit: async () => [],
  summarize: async () => [],
  now: () => new Date('2026-06-25T10:00:00.000Z'),
  ...over,
})

describe('runChangelogGenerate', () => {
  it('no-ops when head sha equals last entry toSha (idempotent)', async () => {
    const { payload, updates } = payloadStub({
      pl: [{ date: 'x', toSha: 'abc', notes: [{ tag: 'platform', text: 'pl' }] }],
      en: [{ date: 'x', toSha: 'abc', notes: [{ tag: 'platform', text: 'en' }] }],
    })
    const res = await runChangelogGenerate(
      baseDeps({ payload, fetchCompare: async () => ({ headSha: 'abc', commits: [{ sha: 'abc', message: 'm' }] }) }),
    )
    expect(res.created).toBe(false)
    expect(updates).toHaveLength(0)
  })

  it('no-ops when all PRs are filtered out', async () => {
    const { payload, updates } = payloadStub({
      pl: [{ date: 'x', toSha: 'old', notes: [{ tag: 'platform', text: 'pl' }] }],
      en: [{ date: 'x', toSha: 'old', notes: [{ tag: 'platform', text: 'en' }] }],
    })
    const res = await runChangelogGenerate(
      baseDeps({
        payload,
        fetchCompare: async () => ({ headSha: 'new', commits: [{ sha: 'c1', message: 'm' }] }),
        fetchPullsForCommit: async () => [pr({ number: 9, title: 'chore: deps' })],
      }),
    )
    expect(res.created).toBe(false)
    expect(updates).toHaveLength(0)
  })

  it('writes one entry in two passes (pl then en) on the happy path, deduping PRs', async () => {
    const { payload, updates } = payloadStub({ pl: [], en: [] })
    const summarize = vi.fn(async (): Promise<Note[]> => [
      { tag: 'apps', pl: 'Apps: bumpy', en: 'Apps: order bumps' },
      { tag: 'security', pl: 'Bezp.', en: 'Security' },
    ])
    const res = await runChangelogGenerate(
      baseDeps({
        payload,
        seedSha: 'seed',
        fetchCompare: async () => ({
          headSha: 'newhead',
          commits: [{ sha: 'c1', message: 'm1' }, { sha: 'c2', message: 'm2' }],
        }),
        // both commits surface PR #5; c2 also surfaces #6 -> dedupe to {5,6}
        fetchPullsForCommit: async (sha) =>
          sha === 'c1'
            ? [pr({ number: 5, title: 'feat: bumps' })]
            : [pr({ number: 5, title: 'feat: bumps' }), pr({ number: 6, title: 'feat(courses): player' })],
        summarize,
      }),
    )

    expect(res.created).toBe(true)
    expect(res.prCount).toBe(2) // deduped
    expect(summarize).toHaveBeenCalledOnce()
    expect(updates.map((u) => u.locale)).toEqual(['pl', 'en'])

    const plEntry = (updates[0].entries as { toSha: string; date: string; notes: { text: string }[] }[]).at(-1)!
    expect(plEntry.toSha).toBe('newhead')
    expect(plEntry.date).toBe('2026-06-25T10:00:00.000Z')
    expect(plEntry.notes.map((n) => n.text)).toEqual(['Apps: bumpy', 'Bezp.'])

    const enEntry = (updates[1].entries as { notes: { text: string; id?: string }[] }[]).at(-1)!
    expect(enEntry.notes.map((n) => n.text)).toEqual(['Apps: order bumps', 'Security'])
    // en pass must carry the ids minted in the pl pass (id-matching)
    expect(enEntry.notes.every((n) => typeof n.id === 'string')).toBe(true)
  })

  it('no-ops on first run when no seed sha is available', async () => {
    const { payload, updates } = payloadStub({ pl: [], en: [] })
    const res = await runChangelogGenerate(
      baseDeps({ payload, seedSha: undefined, fetchCompare: async () => ({ headSha: 'new', commits: [] }) }),
    )
    expect(res.created).toBe(false)
    expect(updates).toHaveLength(0)
  })
})
