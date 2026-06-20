/**
 * Tests for POST /api/apps/checkout — specifically the tier-price server-side
 * validation (the security-critical path).
 *
 * Harness notes (mirrors the courses checkout test pattern):
 * - We mock `payload` so `getPayload` returns a stub with a `find` spy.
 * - We mock `stripe` so `checkout.sessions.create` is a spy we control.
 * - NextRequest needs a full URL in Node env.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── module mocks (hoisted) ─────────────────────────────────────────────────

const sessionsCreate = vi.fn()

vi.mock('stripe', () => {
  class StripeMock {
    checkout = { sessions: { create: sessionsCreate } }
    constructor(_key?: string) {}
  }
  return { default: StripeMock }
})

const find = vi.fn()

vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({ find })),
}))

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))

// ── helpers ────────────────────────────────────────────────────────────────

function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/apps/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockProduct(product: Record<string, unknown> | null) {
  find.mockResolvedValue({ docs: product ? [product] : [] })
}

const SINGLE_PRICE_PRODUCT = {
  id: 1,
  title: 'My App',
  slug: 'my-app',
  priceCents: 4900,
  currency: 'usd',
  stripePriceId: null,
  downloadFiles: ['file-id-1'],
  tiers: null,
}

const TIERED_PRODUCT = {
  id: 2,
  title: 'My Tiered App',
  slug: 'my-tiered-app',
  priceCents: 0,
  currency: 'usd',
  stripePriceId: null,
  downloadFiles: ['file-id-1'],
  tiers: [
    { name: 'Starter', priceCents: 4900, currency: 'usd', id: 'tier-1' },
    { name: 'Pro', priceCents: 9900, currency: 'usd', id: 'tier-2', recommended: true },
    { name: 'Agency', priceCents: 19900, currency: 'usd', id: 'tier-3' },
  ],
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('POST /api/apps/checkout — tier-price validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/x' })
  })

  // ── single-price (no tiers) — regression ──────────────────────────────

  it('single-price: rejects without consent (400)', async () => {
    const { POST } = await import('./route')
    mockProduct(SINGLE_PRICE_PRODUCT)
    const res = await POST(makeReq({ slug: 'my-app', consent: false }))
    expect(res.status).toBe(400)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it('single-price: creates session with productId metadata', async () => {
    const { POST } = await import('./route')
    mockProduct(SINGLE_PRICE_PRODUCT)
    const res = await POST(makeReq({ slug: 'my-app', consent: true }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/x' })
    const arg = sessionsCreate.mock.calls[0][0]
    expect(arg.metadata.productId).toBe('1')
    expect(arg.metadata.withdrawalConsent).toBe('true')
    // Single-price: no tier metadata
    expect(arg.metadata.tier).toBeUndefined()
    // Price derived from product record, not client
    expect(arg.line_items[0].price_data.unit_amount).toBe(4900)
    // Hardening: server-chosen amount stamped into metadata so the webhook can
    // reconcile single-price purchases without re-deriving from root fields.
    expect(arg.metadata.expectedCents).toBe('4900')
    expect(arg.metadata.expectedCurrency).toBe('usd')
  })

  it('single-price: 404 for unknown product', async () => {
    const { POST } = await import('./route')
    mockProduct(null)
    const res = await POST(makeReq({ slug: 'nope', consent: true }))
    expect(res.status).toBe(404)
  })

  // ── tiered product — security-critical path ────────────────────────────

  it('tiered: 400 when tierIndex is missing', async () => {
    const { POST } = await import('./route')
    mockProduct(TIERED_PRODUCT)
    const res = await POST(makeReq({ slug: 'my-tiered-app', consent: true }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/tierIndex/)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it('tiered: 400 when tierIndex is out of range (too high)', async () => {
    const { POST } = await import('./route')
    mockProduct(TIERED_PRODUCT)
    const res = await POST(makeReq({ slug: 'my-tiered-app', consent: true, tierIndex: 99 }))
    expect(res.status).toBe(400)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it('tiered: 400 when tierIndex is negative', async () => {
    const { POST } = await import('./route')
    mockProduct(TIERED_PRODUCT)
    const res = await POST(makeReq({ slug: 'my-tiered-app', consent: true, tierIndex: -1 }))
    expect(res.status).toBe(400)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it('tiered: 400 when tierIndex is not a number', async () => {
    const { POST } = await import('./route')
    mockProduct(TIERED_PRODUCT)
    const res = await POST(makeReq({ slug: 'my-tiered-app', consent: true, tierIndex: 'hack' }))
    expect(res.status).toBe(400)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it('tiered: uses TIER price from DB (not client-sent), stamps tier name in metadata', async () => {
    const { POST } = await import('./route')
    mockProduct(TIERED_PRODUCT)
    const res = await POST(makeReq({ slug: 'my-tiered-app', consent: true, tierIndex: 1 }))
    expect(res.status).toBe(200)
    const arg = sessionsCreate.mock.calls[0][0]
    // Must use Pro tier price (9900), not client-sent price or base priceCents (0)
    expect(arg.line_items[0].price_data.unit_amount).toBe(9900)
    expect(arg.line_items[0].price_data.currency).toBe('usd')
    // Tier name recorded in metadata for license tracking
    expect(arg.metadata.tier).toBe('Pro')
    expect(arg.metadata.productId).toBe('2')
    expect(arg.metadata.withdrawalConsent).toBe('true')
    // Hardening: tier's exact price stamped so the webhook reconciles against the
    // CHOSEN tier, not the root priceCents (which is 0 for tiered products).
    expect(arg.metadata.expectedCents).toBe('9900')
    expect(arg.metadata.expectedCurrency).toBe('usd')
  })

  it('tiered: index 0 = Starter tier price (4900)', async () => {
    const { POST } = await import('./route')
    mockProduct(TIERED_PRODUCT)
    const res = await POST(makeReq({ slug: 'my-tiered-app', consent: true, tierIndex: 0 }))
    expect(res.status).toBe(200)
    const arg = sessionsCreate.mock.calls[0][0]
    expect(arg.line_items[0].price_data.unit_amount).toBe(4900)
    expect(arg.metadata.tier).toBe('Starter')
  })

  it('tiered: index 2 = Agency tier price (19900)', async () => {
    const { POST } = await import('./route')
    mockProduct(TIERED_PRODUCT)
    const res = await POST(makeReq({ slug: 'my-tiered-app', consent: true, tierIndex: 2 }))
    expect(res.status).toBe(200)
    const arg = sessionsCreate.mock.calls[0][0]
    expect(arg.line_items[0].price_data.unit_amount).toBe(19900)
    expect(arg.metadata.tier).toBe('Agency')
  })

  it('tiered: consent still required even with valid tierIndex (400)', async () => {
    const { POST } = await import('./route')
    mockProduct(TIERED_PRODUCT)
    const res = await POST(makeReq({ slug: 'my-tiered-app', consent: false, tierIndex: 0 }))
    expect(res.status).toBe(400)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })
})

// ── per-locale pricing ───────────────────────────────────────────────────────
// Tier priceCents + currency are localized: PL and EN can be priced
// independently. The checkout must read the product at the BUYER's locale so the
// amount charged matches the price shown on that locale's page.

describe('POST /api/apps/checkout — per-locale tier pricing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/x' })
  })

  // find() resolves a product whose tier price/currency depend on the locale it
  // was read at — mirroring how Payload returns localized values.
  function mockLocalizedProduct() {
    find.mockImplementation(async (args: { locale?: string }) => {
      const pln = [{ name: 'Starter', priceCents: 14900, currency: 'pln', id: 'tier-1' }]
      const usd = [{ name: 'Starter', priceCents: 4900, currency: 'usd', id: 'tier-1' }]
      const tiers = args?.locale === 'pl' ? pln : usd
      return { docs: [{ ...TIERED_PRODUCT, tiers }] }
    })
  }

  it('reads the product at locale=pl and charges the PLN tier price', async () => {
    const { POST } = await import('./route')
    mockLocalizedProduct()
    const res = await POST(makeReq({ slug: 'my-tiered-app', consent: true, tierIndex: 0, locale: 'pl' }))
    expect(res.status).toBe(200)
    expect(find.mock.calls[0][0].locale).toBe('pl')
    const arg = sessionsCreate.mock.calls[0][0]
    expect(arg.line_items[0].price_data.unit_amount).toBe(14900)
    expect(arg.line_items[0].price_data.currency).toBe('pln')
    expect(arg.metadata.expectedCents).toBe('14900')
    expect(arg.metadata.expectedCurrency).toBe('pln')
  })

  it('reads the product at locale=en and charges the USD tier price', async () => {
    const { POST } = await import('./route')
    mockLocalizedProduct()
    const res = await POST(makeReq({ slug: 'my-tiered-app', consent: true, tierIndex: 0, locale: 'en' }))
    expect(res.status).toBe(200)
    expect(find.mock.calls[0][0].locale).toBe('en')
    const arg = sessionsCreate.mock.calls[0][0]
    expect(arg.line_items[0].price_data.unit_amount).toBe(4900)
    expect(arg.line_items[0].price_data.currency).toBe('usd')
    expect(arg.metadata.expectedCurrency).toBe('usd')
  })

  it('defaults to locale=pl when locale is absent', async () => {
    const { POST } = await import('./route')
    mockLocalizedProduct()
    const res = await POST(makeReq({ slug: 'my-tiered-app', consent: true, tierIndex: 0 }))
    expect(res.status).toBe(200)
    expect(find.mock.calls[0][0].locale).toBe('pl')
    expect(sessionsCreate.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(14900)
  })
})
