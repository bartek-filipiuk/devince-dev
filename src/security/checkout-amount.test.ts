/**
 * D6 — the price is a SERVER-side value, end to end:
 *   (a) POST /api/apps/checkout: client-smuggled price fields are ignored —
 *       the Stripe session is created with the DB price (tier record)
 *   (b) webhook verifyAmount: a session whose amount_total is below the DB
 *       price gets NO fulfillment + a payment_mismatch alert
 *
 * Harness mirrors checkout.test.ts (a) and webhook.test.ts (b).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── stripe mock (hoisted) — shared by both routes ───────────────────────────

const sessionsCreate = vi.fn()
const constructEvent = vi.fn()

vi.mock('stripe', () => {
  class StripeMock {
    checkout = { sessions: { create: sessionsCreate, list: vi.fn() } }
    webhooks = { constructEvent }
    prices = { retrieve: vi.fn() }
    constructor(_key?: string) {}
  }
  return { default: StripeMock }
})

// ── payload mock (hoisted) ──────────────────────────────────────────────────

const find = vi.fn()
const create = vi.fn()
const update = vi.fn()
const findByID = vi.fn()

const payloadStub = {
  find,
  create,
  update,
  delete: vi.fn(),
  findByID,
  forgotPassword: vi.fn(async () => 'reset_tok'),
}

vi.mock('payload', () => ({
  getPayload: vi.fn(async () => payloadStub),
}))

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))

// ── side-effect mocks ───────────────────────────────────────────────────────

const notifyEvent = vi.fn(async () => {})
vi.mock('@/utilities/notify', () => ({ notifyEvent }))

vi.mock('@/utilities/brevo', () => ({
  sendCourseAccessEmail: vi.fn(async () => {}),
  sendDownloadLinkEmail: vi.fn(async () => {}),
  sendSellerSaleNotification: vi.fn(async () => {}),
}))

const fulfillAppPurchase = vi.fn(async () => ({ created: true, token: 'tok_x' }))
vi.mock('@/utilities/appsFulfillment', () => ({ fulfillAppPurchase }))

vi.mock('@/utilities/ndqsEnroll', () => ({ enrollNdqsByEmail: vi.fn(async () => ({ ok: true, status: 200 })) }))
vi.mock('@/utilities/ndqsRevoke', () => ({ revokeNdqsByEmail: vi.fn(async () => ({ ok: true, status: 200 })) }))

// ── fixtures ────────────────────────────────────────────────────────────────

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
    { name: 'Pro', priceCents: 9900, currency: 'usd', id: 'tier-2' },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x'
  sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/x' })
  create.mockResolvedValue({})
  update.mockResolvedValue({})
})

describe('(a) POST /api/apps/checkout — price comes from the DB, never the client', () => {
  it('ignores client-smuggled price fields; session uses the DB tier price', async () => {
    const { POST } = await import('../app/(frontend)/api/apps/checkout/route')
    find.mockResolvedValue({ docs: [TIERED_PRODUCT] })

    const res = await POST(
      new NextRequest('http://localhost/api/apps/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: 'my-tiered-app',
          consent: true,
          tierIndex: 1, // Pro = 9900 in the DB
          // ── attack payload: every price-shaped field an attacker might try ──
          priceCents: 1,
          price: 1,
          amount: 1,
          unit_amount: 1,
          currency: 'idr',
          stripePriceId: 'price_attacker',
          tiers: [{ name: 'Pro', priceCents: 1, currency: 'idr' }],
        }),
      }),
    )

    expect(res.status).toBe(200)
    expect(sessionsCreate).toHaveBeenCalledOnce()
    const arg = sessionsCreate.mock.calls[0][0]
    // The DB tier price won — none of the smuggled values leaked into Stripe.
    expect(arg.line_items[0].price_data.unit_amount).toBe(9900)
    expect(arg.line_items[0].price_data.currency).toBe('usd')
    expect(arg.metadata.expectedCents).toBe('9900')
    expect(arg.metadata.expectedCurrency).toBe('usd')
    expect(JSON.stringify(arg)).not.toContain('price_attacker')
    expect(JSON.stringify(arg)).not.toContain('idr')
  })

  it('client cannot mint a free/cheap session by pointing tierIndex outside the list', async () => {
    const { POST } = await import('../app/(frontend)/api/apps/checkout/route')
    find.mockResolvedValue({ docs: [TIERED_PRODUCT] })

    const res = await POST(
      new NextRequest('http://localhost/api/apps/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: 'my-tiered-app', consent: true, tierIndex: 2 ** 31 }),
      }),
    )

    expect(res.status).toBe(400)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })
})

describe('(b) webhook verifyAmount — underpaid session gets no fulfillment', () => {
  function stageWebhook(amountTotal: number) {
    constructEvent.mockReturnValue({
      id: `evt_amt_${amountTotal}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_app_1',
          payment_status: 'paid',
          amount_total: amountTotal,
          currency: 'pln',
          customer_details: { email: 'buyer@example.com' },
          metadata: { productId: '7', withdrawalConsentAt: '2026-07-06T00:00:00Z' },
        },
      },
    })
    find.mockResolvedValue({ docs: [] }) // no dedup hit, no users
    findByID.mockResolvedValue({ id: 7, title: 'App', priceCents: 4900, currency: 'pln' })
  }

  function webhookReq() {
    return new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig', 'content-type': 'application/json' },
      body: '{}',
    })
  }

  it('amount_total below the DB price → NO grant + payment_mismatch alert', async () => {
    const { POST } = await import('../app/(frontend)/api/stripe/webhook/route')
    stageWebhook(100) // paid 1 zł for a 49 zł product

    const res = await POST(webhookReq())

    expect(res.status).toBe(200) // clean skip, not a retry-storm 500
    expect(fulfillAppPurchase).not.toHaveBeenCalled()
    expect(notifyEvent).toHaveBeenCalledWith(
      'payment_mismatch',
      expect.objectContaining({ paid: 100, expected: 4900 }),
    )
  })

  it('amount_total matching the DB price → fulfillment runs', async () => {
    const { POST } = await import('../app/(frontend)/api/stripe/webhook/route')
    stageWebhook(4900)

    const res = await POST(webhookReq())

    expect(res.status).toBe(200)
    expect(fulfillAppPurchase).toHaveBeenCalledOnce()
    expect(notifyEvent).not.toHaveBeenCalledWith('payment_mismatch', expect.anything())
  })
})
