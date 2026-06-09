import { describe, it, expect } from 'vitest'
import { translationsForTest as translations } from './translations'

describe('i18n dictionary', () => {
  it('has identical key sets for pl and en', () => {
    const plKeys = Object.keys(translations.pl).sort()
    const enKeys = Object.keys(translations.en).sort()
    expect(enKeys).toEqual(plKeys)
  })
})
