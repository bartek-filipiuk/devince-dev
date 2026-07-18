import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rateLimitOk, resolveProgramSlugForUser } from '@/utilities/agentMcp'

describe('rateLimitOk', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  it('60 wywołań przechodzi, 61. w oknie odpada, po minucie znowu OK', () => {
    vi.setSystemTime(new Date('2026-07-05T12:00:00Z'))
    for (let i = 0; i < 60; i++) expect(rateLimitOk(1)).toBe(true)
    expect(rateLimitOk(1)).toBe(false)
    expect(rateLimitOk(2)).toBe(true) // limit per user
    vi.setSystemTime(new Date('2026-07-05T12:01:01Z'))
    expect(rateLimitOk(1)).toBe(true)
  })
})

describe('resolveProgramSlugForUser', () => {
  const mk = (memberDocs: unknown[], programDocs: unknown[]) => ({
    find: vi.fn(async ({ collection }: { collection: string }) =>
      collection === 'cohort-members' ? { docs: memberDocs } : { docs: programDocs },
    ),
  })
  it('jeden kurs kohortowy → jego slug; podany argument wygrywa; wiele bez argumentu → błąd z listą', async () => {
    const one = mk([{ program: 7 }], [{ id: 7, slug: 'dadmode' }])
    expect(await resolveProgramSlugForUser(one as never, 1, undefined)).toEqual({ ok: true, slug: 'dadmode' })
    const two = mk([{ program: 7 }, { program: 8 }], [{ id: 7, slug: 'a' }, { id: 8, slug: 'b' }])
    expect(await resolveProgramSlugForUser(two as never, 1, 'b')).toEqual({ ok: true, slug: 'b' })
    const err = await resolveProgramSlugForUser(two as never, 1, undefined)
    expect(err.ok).toBe(false)
    if (!err.ok) expect(err.error).toContain('a')
  })
  it('kurs spoza członkostwa usera → błąd (argument nie daje dostępu)', async () => {
    const one = mk([{ program: 7 }], [{ id: 7, slug: 'dadmode' }])
    const res = await resolveProgramSlugForUser(one as never, 1, 'cudzy-kurs')
    expect(res.ok).toBe(false)
  })
  it('zero kursów → błąd', async () => {
    const none = mk([], [])
    expect((await resolveProgramSlugForUser(none as never, 1, undefined)).ok).toBe(false)
  })
})
