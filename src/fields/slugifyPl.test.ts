import { describe, expect, it } from 'vitest'

import { slugifyPl } from './slugifyPl'

describe('slugifyPl', () => {
  it('transliteruje polskie diakrytyki zamiast je wycinać', () => {
    // Regresja: domyślny slugify Payloada dawał tu "017-sekundy-tyle-zajo-caej-bazy"
    expect(slugifyPl('0,17 sekundy. Tyle zajęło całej bazy')).toBe(
      '017-sekundy-tyle-zajelo-calej-bazy',
    )
  })

  it('obsługuje wszystkie polskie znaki, także ł którego NFD nie rozkłada', () => {
    expect(slugifyPl('Zażółć gęślą jaźń ŁÓDŹ')).toBe('zazolc-gesla-jazn-lodz')
  })

  it('zwija wielokrotne spacje i myślniki oraz obcina je z brzegów', () => {
    expect(slugifyPl('  TEST — do usunięcia  ')).toBe('test-do-usuniecia')
  })

  it('radzi sobie z innymi diakrytykami łacińskimi', () => {
    expect(slugifyPl('Café Größe naïve')).toBe('cafe-groe-naive')
  })

  it('nie wywraca się na pustych wartościach', () => {
    expect(slugifyPl('')).toBe('')
    expect(slugifyPl(null)).toBe('')
    expect(slugifyPl(undefined)).toBe('')
  })

  it('zostawia poprawny slug bez zmian (idempotencja)', () => {
    const slug = 'juz-poprawny-slug-123'
    expect(slugifyPl(slug)).toBe(slug)
  })
})
