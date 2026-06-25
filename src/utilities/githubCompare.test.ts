import { describe, it, expect } from 'vitest'
import { parseCompare } from './githubCompare'

describe('parseCompare', () => {
  it('maps commits and takes the last sha as head', () => {
    const json = {
      commits: [
        { sha: 'aaa', commit: { message: 'feat: first' } },
        { sha: 'bbb', commit: { message: 'fix: second\n\nbody' } },
      ],
    }
    expect(parseCompare(json)).toEqual({
      headSha: 'bbb',
      commits: [
        { sha: 'aaa', message: 'feat: first' },
        { sha: 'bbb', message: 'fix: second\n\nbody' },
      ],
    })
  })

  it('returns an empty result for an empty compare (base == head)', () => {
    expect(parseCompare({ commits: [] })).toEqual({ headSha: '', commits: [] })
  })

  it('is tolerant of malformed input (no throw, empty result)', () => {
    expect(parseCompare(null)).toEqual({ headSha: '', commits: [] })
    expect(parseCompare({})).toEqual({ headSha: '', commits: [] })
    expect(parseCompare({ commits: 'nope' })).toEqual({ headSha: '', commits: [] })
  })
})
