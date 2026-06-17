import { describe, expect, it } from 'vitest'
import { formatPrice } from './formatPrice'

describe('formatPrice', () => {
  it('formats PLN with comma decimals', () => {
    expect(formatPrice(4900, 'pln')).toMatch(/49[,.]00\s*zł/)
  })
  it('formats EUR', () => {
    expect(formatPrice(1200, 'eur')).toMatch(/12[,.]00\s*€/)
  })
  it('formats USD', () => {
    expect(formatPrice(500, 'usd')).toMatch(/5[,.]00\s*(USD|\$)/)
  })
})
