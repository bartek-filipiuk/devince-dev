import { describe, expect, it } from 'vitest'
import { buildLineItem } from './checkoutLineItem'

describe('buildLineItem', () => {
  it('uses stripePriceId when present', () => {
    expect(buildLineItem({ title: 'App', priceCents: 4900, currency: 'pln', stripePriceId: 'price_123' })).toEqual({
      price: 'price_123',
      quantity: 1,
    })
  })
  it('falls back to price_data from priceCents/currency/title', () => {
    expect(buildLineItem({ title: 'App', priceCents: 4900, currency: 'pln', stripePriceId: null })).toEqual({
      price_data: { currency: 'pln', unit_amount: 4900, product_data: { name: 'App' } },
      quantity: 1,
    })
  })
  it('treats empty-string stripePriceId as absent', () => {
    expect(buildLineItem({ title: 'A', priceCents: 100, currency: 'eur', stripePriceId: '' })).toHaveProperty('price_data')
  })
})
