/**
 * D2 — POST /api/stripe/webhook: replay of the SAME event.id must be a no-op.
 *
 * Attack: Stripe (or an attacker replaying a captured delivery) posts the same
 * signed event twice. Dedup lives in the `stripe-events` collection — the
 * second delivery must fulfill NOTHING and write NO second row.
 *
 * Harness mirrors webhook.test.ts, but the payload stub is STATEFUL: rows
 * created in `stripe-events` are remembered, so the replay's dedup query
 * really finds the first delivery's row (no hand-waved mock ordering).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── stripe mock (hoisted) ───────────────────────────────────────────────────

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

// ── stateful payload mock (hoisted) ─────────────────────────────────────────

/** eventIds persisted to `stripe-events` across requests in one test. */
const storedEventIds: string[] = []

const find = vi.fn(async ({ collection, where }: { collection: string; where?: any }) => {
  if (collection === 'stripe-events') {
    const wanted = where?.eventId?.equals
    return { docs: storedEventIds.includes(wanted) ? [{ id: 1, eventId: wanted }] : [] }
  }
  return { docs: [] }
})
const create = vi.fn(async ({ collection, data }: { collection: string; data?: any }) => {
  if (collection === 'stripe-events') storedEventIds.push(data.eventId)
  return { id: 99, ...data }
})
const update = vi.fn(async () => ({}))
const findByID = vi.fn()
const forgotPassword = vi.fn(async () => 'reset_tok')

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

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig', 'content-type': 'application/json' },
    body: '{}',
  })
}

const APP_EVENT = {
  id: 'evt_replay_1',
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
  storedEventIds.length = 0
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x'
  constructEvent.mockReturnValue(APP_EVENT) // same event object every delivery
  findByID.mockResolvedValue({ id: 7, title: 'App', priceCents: 4900, currency: 'pln' })
})

describe('stripe webhook — idempotency (replay)', () => {
  it('first delivery fulfills and records the event id', async () => {
    const { POST } = await import('../app/(frontend)/api/stripe/webhook/route')

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    expect(fulfillAppPurchase).toHaveBeenCalledOnce()
    expect(storedEventIds).toEqual(['evt_replay_1'])
  })

  it('replay of the same event.id is a no-op: no second fulfillment, no second row', async () => {
    const { POST } = await import('../app/(frontend)/api/stripe/webhook/route')

    // Delivery 1 — fulfills.
    const first = await POST(makeReq())
    expect(first.status).toBe(200)
    expect(fulfillAppPurchase).toHaveBeenCalledOnce()

    // Delivery 2 — SAME event.id (replay).
    const second = await POST(makeReq())
    expect(second.status).toBe(200)
    expect(await second.json()).toMatchObject({ duplicate: true })

    // Fulfillment count did NOT grow; still exactly one stored row.
    expect(fulfillAppPurchase).toHaveBeenCalledOnce()
    expect(storedEventIds).toEqual(['evt_replay_1'])
    // No email re-sent, no extra sale notification on the replay.
    expect(sendDownloadLinkEmail).toHaveBeenCalledTimes(1)
    expect(sendSellerSaleNotification).toHaveBeenCalledTimes(1)
  })
})
