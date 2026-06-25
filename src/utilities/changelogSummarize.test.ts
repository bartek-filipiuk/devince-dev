import { describe, it, expect, vi } from 'vitest'
import { summarizeChangelog, type AnthropicLike } from './changelogSummarize'
import type { SelectedPR } from './changelogSelect'

const pr = (over: Partial<SelectedPR>): SelectedPR => ({
  number: 1,
  title: '',
  body: '',
  labels: [],
  isSecurity: false,
  ...over,
})

const fakeClient = (
  impl: AnthropicLike['messages']['create'],
): AnthropicLike => ({ messages: { create: impl } })

describe('summarizeChangelog', () => {
  it('returns [] for no PRs without calling the model', async () => {
    const create = vi.fn()
    const out = await summarizeChangelog([], { client: fakeClient(create) })
    expect(out).toEqual([])
    expect(create).not.toHaveBeenCalled()
  })

  it('returns parsed notes from the model (capped at 5)', async () => {
    const notes = Array.from({ length: 7 }, (_, i) => ({
      tag: 'platform',
      pl: `pl ${i}`,
      en: `en ${i}`,
    }))
    const client = fakeClient(async () => ({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify({ notes }) }],
    }))
    const out = await summarizeChangelog([pr({ title: 'feat: x' })], { client })
    expect(out).toHaveLength(5)
    expect(out[0]).toEqual({ tag: 'platform', pl: 'pl 0', en: 'en 0' })
  })

  it('falls back to title-derived notes when the model throws', async () => {
    const client = fakeClient(async () => {
      throw new Error('boom')
    })
    const out = await summarizeChangelog(
      [pr({ number: 1, title: 'fix(apps): mobile reader' }), pr({ number: 2, title: 'feat: course player', labels: ['courses'] })],
      { client },
    )
    expect(out).toHaveLength(2)
    expect(out[0].tag).toBe('apps')
    expect(out[0].pl).toMatch(/mobile reader/i)
    expect(out[0].pl).toBe(out[0].en) // offline fallback can't translate
  })

  it('falls back on a refusal stop_reason', async () => {
    const client = fakeClient(async () => ({ stop_reason: 'refusal', content: [] }))
    const out = await summarizeChangelog([pr({ title: 'feat: thing' })], { client })
    expect(out).toHaveLength(1)
  })

  it('phrases security PRs generically in the fallback', async () => {
    const client = fakeClient(async () => {
      throw new Error('boom')
    })
    const out = await summarizeChangelog(
      [pr({ title: 'security: bump payload CVE-2026-1234', isSecurity: true })],
      { client },
    )
    expect(out[0].tag).toBe('security')
    expect(out[0].pl).not.toMatch(/CVE|payload/i)
    expect(out[0].pl).toMatch(/bezpiecze/i)
    expect(out[0].en).toMatch(/security/i)
  })
})
