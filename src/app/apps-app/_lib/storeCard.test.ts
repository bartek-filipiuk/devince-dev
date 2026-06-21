import { describe, it, expect } from 'vitest'
import { hueFromString, monogram, cheapestTier, firstLineFromLexical } from './storeCard'

describe('storeCard helpers', () => {
  it('hueFromString is deterministic and in [0,360)', () => {
    const a = hueFromString('course-platform-starter')
    const b = hueFromString('course-platform-starter')
    expect(a).toBe(b)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(360)
    expect(hueFromString('other')).not.toBe(a) // different input -> (almost certainly) different hue
  })

  it('monogram returns the uppercased first character', () => {
    expect(monogram('course-platform-starter')).toBe('C')
    expect(monogram('  idea')).toBe('I')
    expect(monogram('')).toBe('?')
  })

  it('cheapestTier picks the lowest priceCents, or null when not tiered', () => {
    const product = {
      tiers: [
        { name: 'Pro', priceCents: 29900, currency: 'pln' as const },
        { name: 'Starter', priceCents: 14900, currency: 'pln' as const },
        { name: 'Agency', priceCents: 59900, currency: 'pln' as const },
      ],
    }
    expect(cheapestTier(product as never)?.name).toBe('Starter')
    expect(cheapestTier({ tiers: null } as never)).toBeNull()
    expect(cheapestTier({ tiers: [] } as never)).toBeNull()
  })

  it('firstLineFromLexical extracts the first non-empty block text', () => {
    const rt = {
      root: {
        children: [
          { type: 'paragraph', children: [{ type: 'text', text: 'Ship your own course platform in a weekend.' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Second line.' }] },
        ],
      },
    }
    expect(firstLineFromLexical(rt)).toBe('Ship your own course platform in a weekend.')
    expect(firstLineFromLexical(null)).toBeNull()
    expect(firstLineFromLexical({ root: { children: [] } })).toBeNull()
  })
})
