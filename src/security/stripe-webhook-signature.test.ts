/**
 * D1 — POST /api/stripe/webhook: signature verification is the trust boundary.
 *
 * Attack cases:
 *   (a) no `stripe-signature` header → 4xx AND zero fulfillment/DB side effects
 *   (b) forged signature (constructEvent throws) → 4xx AND zero side effects
 *   (c) valid signature → 2xx (event processed)
 *
 * Harness mirrors src/app/(frontend)/api/stripe/webhook/webhook.test.ts:
 * stripe + payload module mocks with shared spies. The constructEvent mock
 * behaves like the real SDK: it THROWS unless the signature matches — so the
 * route cannot pass these tests by skipping verification.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── stripe mock (hoisted) ───────────────────────────────────────────────────

const VALID_SIG = 't=1,v1=valid'

const constructEvent = vi.fn()

vi.mock('stripe', () => {
  class StripeMock {
    webhooks = { constructEvent }
    prices = { retrieve: vi.fn() }
    checkout = { sessions: { list: vi.fn() } }
    constructor(_key?: string) {}
  }
  return { default: StripeMock }
})

// ── payload mock (hoisted) ──────────────────────────────────────────────────

const find = vi.fn()
const create = vi.fn()
const update = vi.fn()
const findByID = vi.fn()
const forgotPassword = vi.fn()

const payloadStub = { find, create, update, delete: vi.fn(), findByID, forgotPassword }

vi.mock('payload', () => ({
  getPayload: vi.fn(async () => payloadStub),
}))

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))

// ── side-effect mocks ───────────────────────────────────────────────────────

const notifyEvent = vi.fn(async () => {})
vi.mock('@/utilities/notify', () => ({ notifyEvent }))

const sendCourseAccessEmail = vi.fn(async () => {})
const sendDownloadLinkEmail = vi.fn(async () => {})
const sendSellerSaleNotification = vi.fn(async () => {})
vi.mock('@/utilities/brevo', () => ({
  sendCourseAccessEmail,
  sendDownloadLinkEmail,
  sendSellerSaleNotification,
}))

const fulfillAppPurchase = vi.fn(async () => ({ created: true, token: 'tok_x' }))
vi.mock('@/utilities/appsFulfillment', () => ({ fulfillAppPurchase }))

vi.mock('@/utilities/ndqsEnroll', () => ({ enrollNdqsByEmail: vi.fn(async () => ({ ok: true, status: 200 })) }))
vi.mock('@/utilities/ndqsRevoke', () => ({ revokeNdqsByEmail: vi.fn(async () => ({ ok: true, status: 200 })) }))

// ── helpers ─────────────────────────────────────────────────────────────────

function makeReq(sig?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (sig !== undefined) headers['stripe-signature'] = sig
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers,
    body: JSON.stringify({ id: 'evt_forged', type: 'checkout.session.completed' }),
  })
}

const PAID_APP_EVENT = {
  id: 'evt_sig_1',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_app_1',
      payment_status: 'paid',
      amount_total: 4900,
      currency: 'pln',
      customer_details: { email: 'buyer@example.com' },
      metadata: { productId: '7', withdrawalConsentAt: '2026-07-06T00:00:00Z' },
    },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x'
  // Real-SDK behavior: throw unless the signature is the valid one.
  constructEvent.mockImplementation((_raw: string, sig: string) => {
    if (sig !== VALID_SIG) throw new Error('signature verification failed')
    return PAID_APP_EVENT
  })
  find.mockResolvedValue({ docs: [] })
  create.mockResolvedValue({})
  findByID.mockResolvedValue({ id: 7, title: 'App', priceCents: 4900, currency: 'pln' })
})

describe('stripe webhook — signature before anything else', () => {
  it('(a) rejects a request WITHOUT the stripe-signature header: 4xx, no fulfillment, no DB touch', async () => {
    const { POST } = await import('../app/(frontend)/api/stripe/webhook/route')

    const res = await POST(makeReq(undefined))

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
    // Body of the forged request must NOT have been trusted:
    expect(fulfillAppPurchase).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    // No stripe-events row, no user lookup — the DB is never touched.
    expect(create).not.toHaveBeenCalled()
    expect(find).not.toHaveBeenCalled()
  })

  it('(b) rejects a FORGED signature: 4xx, no fulfillment, no DB touch', async () => {
    const { POST } = await import('../app/(frontend)/api/stripe/webhook/route')

    const res = await POST(makeReq('t=1,v1=forged'))

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
    expect(constructEvent).toHaveBeenCalled() // verification WAS attempted
    expect(fulfillAppPurchase).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
    expect(find).not.toHaveBeenCalled()
    expect(sendDownloadLinkEmail).not.toHaveBeenCalled()
  })

  it('(c) accepts a VALID signature: 2xx and the event is processed', async () => {
    const { POST } = await import('../app/(frontend)/api/stripe/webhook/route')

    const res = await POST(makeReq(VALID_SIG))

    expect(res.status).toBe(200)
    // constructEvent received the RAW body + the configured secret.
    expect(constructEvent).toHaveBeenCalledWith(expect.any(String), VALID_SIG, 'whsec_x')
    // Paid, price-reconciled app session → fulfillment ran exactly once.
    expect(fulfillAppPurchase).toHaveBeenCalledOnce()
    // Idempotency row recorded for the verified event id.
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'stripe-events',
        data: expect.objectContaining({ eventId: 'evt_sig_1' }),
      }),
    )
  })
})
