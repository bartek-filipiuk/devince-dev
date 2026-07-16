/**
 * D0 harness smoke test for the security-regression suite (src/security/).
 * Confirms vitest picks up this directory and the `@/` tsconfig alias resolves.
 */
import { describe, it, expect } from 'vitest'
import { slugify } from '@/utilities/slugify'

describe('security suite harness', () => {
  it('runs and resolves the @/ alias', () => {
    expect(true).toBe(true)
    expect(slugify('Fable Hardening')).toBe('fable-hardening')
  })
})
