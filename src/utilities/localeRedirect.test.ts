import { describe, it, expect } from 'vitest'
import { stripDefaultLocalePrefix } from './localeRedirect'

describe('stripDefaultLocalePrefix', () => {
  it('strips a normal prefixed path', () => {
    expect(stripDefaultLocalePrefix('/pl/about', 'pl')).toBe('/about')
  })
  it('maps the bare prefix to root', () => {
    expect(stripDefaultLocalePrefix('/pl', 'pl')).toBe('/')
    expect(stripDefaultLocalePrefix('/pl/', 'pl')).toBe('/')
  })
  it('neutralises protocol-relative open redirect (//evil.com)', () => {
    expect(stripDefaultLocalePrefix('/pl//evil.com', 'pl')).toBe('/evil.com')
  })
  it('neutralises backslash open redirect (/\\evil.com)', () => {
    expect(stripDefaultLocalePrefix('/pl/\\evil.com', 'pl')).toBe('/evil.com')
  })
  it('preserves deep paths', () => {
    expect(stripDefaultLocalePrefix('/pl/a/b/c', 'pl')).toBe('/a/b/c')
  })
  it('does not strip a non-boundary match (/plfoo)', () => {
    expect(stripDefaultLocalePrefix('/plfoo', 'pl')).toBe('/plfoo')
  })
})
