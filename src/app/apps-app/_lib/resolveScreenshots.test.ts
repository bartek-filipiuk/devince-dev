import { describe, it, expect } from 'vitest'
import { resolveScreenshots } from './resolveScreenshots'

const idUrl = (u: string | null | undefined) => u ?? null

describe('resolveScreenshots', () => {
  it('maps populated rows to gallery items', () => {
    const rows = [{ image: { url: '/m/a.png', alt: 'A' }, caption: 'Cap A' }]
    expect(resolveScreenshots(rows, 'fallback', idUrl)).toEqual([
      { url: '/m/a.png', alt: 'Cap A', caption: 'Cap A' },
    ])
  })

  it('falls back to image alt, then fallbackAlt, when caption is empty', () => {
    expect(resolveScreenshots([{ image: { url: '/x', alt: 'imgalt' } }], 'fb', idUrl)[0].alt).toBe('imgalt')
    expect(resolveScreenshots([{ image: { url: '/y' } }], 'fb', idUrl)[0].alt).toBe('fb')
  })

  it('skips an unpopulated image (number id) or one that yields no url', () => {
    expect(resolveScreenshots([{ image: 42, caption: 'x' }], 'fb', idUrl)).toEqual([])
    expect(resolveScreenshots([{ image: { url: '/y' } }], 'fb', () => null)).toEqual([])
  })

  it('returns [] for null/empty input', () => {
    expect(resolveScreenshots(null, 'fb', idUrl)).toEqual([])
    expect(resolveScreenshots([], 'fb', idUrl)).toEqual([])
  })
})
