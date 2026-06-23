import { describe, it, expect } from 'vitest'
import { translationsForTest as translations } from './translations'

describe('i18n dictionary', () => {
  it('has identical key sets for pl and en', () => {
    const plKeys = Object.keys(translations.pl).sort()
    const enKeys = Object.keys(translations.en).sort()
    expect(enKeys).toEqual(plKeys)
  })

  it('every pl key has an en counterpart and vice versa', () => {
    const plKeys = Object.keys(translations.pl)
    const enKeys = Object.keys(translations.en)
    for (const key of plKeys) {
      expect(enKeys, `missing en for "${key}"`).toContain(key)
    }
    for (const key of enKeys) {
      expect(plKeys, `missing pl for "${key}"`).toContain(key)
    }
  })

  it('has no empty translation values', () => {
    for (const locale of ['pl', 'en'] as const) {
      for (const [key, value] of Object.entries(translations[locale])) {
        expect(typeof value, `${locale}.${key} must be a string`).toBe('string')
        expect((value as string).length, `${locale}.${key} must not be empty`).toBeGreaterThan(0)
      }
    }
  })

  it('covers the apps + courses subdomain UI keys', () => {
    const plKeys = Object.keys(translations.pl)
    const required = [
      'apps.nav.suffix',
      'apps.store.empty',
      'apps.product.buy',
      'apps.product.gallery',
      'apps.download.remaining',
      'apps.notFound.cta',
      'courses.nav.suffix',
      'courses.store.empty',
      'courses.syllabus.cta',
      'courses.badge.gate',
      'courses.lesson.why',
      'courses.auth.loginTitle',
      'courses.notFound.cta',
      'roadmap.status.in_progress',
      'apps.nav.roadmap',
      'courses.nav.roadmap',
    ]
    for (const key of required) {
      expect(plKeys, `missing key "${key}"`).toContain(key)
    }
  })
})
