import { describe, expect, it, beforeEach } from 'vitest'
import { createRateLimiter } from './rateLimit'

describe('createRateLimiter (fixed-window, in-memory)', () => {
  let now: number
  const clock = () => now

  beforeEach(() => {
    now = 1_000_000
  })

  it('allows up to `max` hits in a window, then blocks', () => {
    const rl = createRateLimiter({ max: 3, windowMs: 60_000, now: clock })
    expect(rl.check('k')).toBe(true) // 1
    expect(rl.check('k')).toBe(true) // 2
    expect(rl.check('k')).toBe(true) // 3
    expect(rl.check('k')).toBe(false) // 4 — over the cap
    expect(rl.check('k')).toBe(false)
  })

  it('keys are independent', () => {
    const rl = createRateLimiter({ max: 1, windowMs: 60_000, now: clock })
    expect(rl.check('a')).toBe(true)
    expect(rl.check('a')).toBe(false)
    expect(rl.check('b')).toBe(true) // different key, fresh budget
  })

  it('resets after the window elapses', () => {
    const rl = createRateLimiter({ max: 1, windowMs: 60_000, now: clock })
    expect(rl.check('k')).toBe(true)
    expect(rl.check('k')).toBe(false)
    now += 60_001 // window elapsed
    expect(rl.check('k')).toBe(true)
  })

  it('does not reset just before the window elapses', () => {
    const rl = createRateLimiter({ max: 1, windowMs: 60_000, now: clock })
    expect(rl.check('k')).toBe(true)
    now += 59_999
    expect(rl.check('k')).toBe(false)
  })

  it('nie rośnie w nieskończoność przy zalewie unikalnych kluczy (maxKeys)', () => {
    // Długie okno (24h) => nic nie jest "stale", więc czyszczenie po czasie nie
    // zadziała. Dokładnie ten przypadek produkuje bot podstawiający co żądanie
    // inny adres. Bez limitu kluczy Mapa rosłaby bez końca.
    let t = 1_000
    const rl = createRateLimiter({ max: 3, windowMs: 24 * 60 * 60_000, maxKeys: 50, now: () => t })
    for (let i = 0; i < 500; i++) expect(rl.check(`klucz-${i}`)).toBe(true)
    // Najstarsze klucze zostały wyrzucone, więc dostają świeże okno zamiast blokady.
    expect(rl.check('klucz-0')).toBe(true)
    // Najnowszy klucz nadal ma swoje zliczenie: 1 użyty wyżej + 2 = limit 3.
    expect(rl.check('klucz-499')).toBe(true)
    expect(rl.check('klucz-499')).toBe(true)
    expect(rl.check('klucz-499')).toBe(false)
  })
})
