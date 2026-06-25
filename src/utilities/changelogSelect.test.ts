import { describe, it, expect } from 'vitest'
import { selectChangelogPRs, type PR } from './changelogSelect'

const pr = (over: Partial<PR>): PR => ({ number: 1, title: '', body: '', labels: [], ...over })

describe('selectChangelogPRs', () => {
  it('drops non-user-facing conventional prefixes', () => {
    const prs = [
      pr({ number: 1, title: 'chore: bump deps' }),
      pr({ number: 2, title: 'docs(readme): tweak' }),
      pr({ number: 3, title: 'ci: cache pnpm' }),
      pr({ number: 4, title: 'test: add cases' }),
      pr({ number: 5, title: 'build: dockerfile' }),
      pr({ number: 6, title: 'style: prettier' }),
      pr({ number: 7, title: 'refactor: extract util' }),
    ]
    expect(selectChangelogPRs(prs)).toEqual([])
  })

  it('keeps feat/fix/perf and plain titles', () => {
    const prs = [
      pr({ number: 1, title: 'feat: order bumps' }),
      pr({ number: 2, title: 'fix(apps): mobile reader collapse' }),
      pr({ number: 3, title: 'perf: batch notify' }),
      pr({ number: 4, title: 'Improve apps storefront' }),
    ]
    expect(selectChangelogPRs(prs).map((p) => p.number)).toEqual([1, 2, 3, 4])
    expect(selectChangelogPRs(prs).every((p) => p.isSecurity === false)).toBe(true)
  })

  it('drops PRs marked [skip-changelog] in title or body', () => {
    const prs = [
      pr({ number: 1, title: 'feat: internal tooling [skip-changelog]' }),
      pr({ number: 2, title: 'feat: hidden', body: 'details\n[skip-changelog]\n' }),
      pr({ number: 3, title: 'feat: visible' }),
    ]
    expect(selectChangelogPRs(prs).map((p) => p.number)).toEqual([3])
  })

  it('flags security PRs by prefix or label', () => {
    const prs = [
      pr({ number: 1, title: 'security: bump payload for CVE' }),
      pr({ number: 2, title: 'fix(sec): reset-token leak' }),
      pr({ number: 3, title: 'fix: unrelated bug', labels: ['security'] }),
      pr({ number: 4, title: 'feat: normal' }),
    ]
    const out = selectChangelogPRs(prs)
    expect(out.find((p) => p.number === 1)?.isSecurity).toBe(true)
    expect(out.find((p) => p.number === 2)?.isSecurity).toBe(true)
    expect(out.find((p) => p.number === 3)?.isSecurity).toBe(true)
    expect(out.find((p) => p.number === 4)?.isSecurity).toBe(false)
  })
})
