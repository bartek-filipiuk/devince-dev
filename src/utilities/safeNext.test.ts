import { describe, it, expect } from 'vitest'
import { safeNext } from './safeNext'

describe('safeNext', () => {
  const fallback = '/account'

  // ---- happy path ----
  it("accepts a simple relative path '/kurs'", () => {
    expect(safeNext('/kurs', fallback)).toBe('/kurs')
  })

  it('accepts a deeper relative path', () => {
    expect(safeNext('/kurs/lekcja-1', fallback)).toBe('/kurs/lekcja-1')
  })

  // ---- open-redirect attacks ----
  it("rejects protocol-relative '//evil.com'", () => {
    expect(safeNext('//evil.com', fallback)).toBe(fallback)
  })

  it("rejects absolute URL 'https://evil.com'", () => {
    expect(safeNext('https://evil.com', fallback)).toBe(fallback)
  })

  it("rejects backslash trick '/a\\\\b'", () => {
    expect(safeNext('/a\\b', fallback)).toBe(fallback)
  })

  it('rejects null', () => {
    expect(safeNext(null, fallback)).toBe(fallback)
  })

  it('rejects empty string', () => {
    expect(safeNext('', fallback)).toBe(fallback)
  })

  // ---- control-char / scheme tricks ----
  it('rejects a path with whitespace', () => {
    expect(safeNext('/kurs lekcja', fallback)).toBe(fallback)
  })

  it('rejects a path with a tab character', () => {
    expect(safeNext('/kurs\tlekcja', fallback)).toBe(fallback)
  })

  it('rejects a leading scheme after slash e.g. /javascript:alert(1)', () => {
    expect(safeNext('/javascript:alert(1)', fallback)).toBe(fallback)
  })

  it('rejects a path with a C0 control char', () => {
    // \x01 is a C0 control character
    expect(safeNext('/kurs\x01', fallback)).toBe(fallback)
  })
})
