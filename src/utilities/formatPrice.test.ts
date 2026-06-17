import { describe, expect, it } from 'vitest'
import { formatPrice } from './formatPrice'

describe('formatPrice', () => {
  it('formats PLN with comma decimals and zł suffix (pl-PL)', () => {
    expect(formatPrice(4900, 'pln')).toMatch(/49,00\s*zł/)
  })
  it('formats USD with leading $ and dot decimals (en-US)', () => {
    expect(formatPrice(4900, 'usd')).toMatch(/\$\s*49\.00/)
  })
  it('formats EUR with leading € and dot decimals (en-IE)', () => {
    expect(formatPrice(1200, 'eur')).toMatch(/€\s*12\.00/)
  })
})
