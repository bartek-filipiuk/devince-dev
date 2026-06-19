import { describe, it, expect } from 'vitest'
import { slugify, uniqueSlug } from './slugify'

describe('slugify', () => {
  it('lowercases and dash-joins', () => {
    expect(slugify('Krok 1: Konfiguracja')).toBe('krok-1-konfiguracja')
  })
  it('folds Polish diacritics', () => {
    expect(slugify('Zażółć gęślą jaźń')).toBe('zazolc-gesla-jazn')
    expect(slugify('Łatwy start')).toBe('latwy-start')
  })
  it('trims stray dashes and symbols', () => {
    expect(slugify('  —Hello, World!— ')).toBe('hello-world')
  })
})

describe('uniqueSlug', () => {
  it('suffixes repeats using the seen map', () => {
    const seen = new Map<string, number>()
    expect(uniqueSlug('Setup', seen)).toBe('setup')
    expect(uniqueSlug('Setup', seen)).toBe('setup-1')
    expect(uniqueSlug('Setup', seen)).toBe('setup-2')
  })
})
