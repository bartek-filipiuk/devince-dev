/**
 * Tests for POST /api/stripe/webhook — the MONEY-CRITICAL fulfillment webhook.
 *
 * Security focus (the three fixes under test):
 *   1. payment_status gate — an `unpaid` completed session must NOT grant.
 *   2. amount/currency reconciliation — a session paying LESS than the item's
 *      real price (or in the wrong currency) must NOT grant and must alert.
 *   3. refund revocation — a `charge.refunded` for a course/app purchase must
 *      walk back to the session and revoke the course (purchases) / app (grant).
 *
 * Harness notes (mirrors api/courses/checkout/checkout.test.ts):
 * - The route calls `getPayload({ config })` then Local-API methods. We mock the
 *   `payload` module so `getPayload` resolves a stub whose `find/create/update/
 *   delete/findByID/forgotPassword` are spies we drive per-test.
 * - The route constructs `new Stripe(...)` lazily and uses
 *   `webhooks.constructEvent`, `prices.retrieve`, `checkout.sessions.list`. We
 *   mock the `stripe` default export to a class exposing shared spies. The
 *   `constructEvent` spy returns whatever event we stage (signature verification
 *   is the trust boundary; we bypass it by returning a pre-built event).
 * - The fulfillment side effects (Brevo, apps grant, NDQS enroll/revoke,
 *   notifyEvent) are mocked so we assert ONLY the grant/skip decision + alerts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── stripe mock (hoisted) ───────────────────────────────────────────────────

const constructEvent = vi.fn()
const pricesRetrieve = vi.fn()
const sessionsList = vi.fn()

vi.mock('stripe', () => {
  class StripeMock {
    webhooks = { constructEvent }
    prices = { retrieve: pricesRetrieve }
    checkout = { sessions: { list: sessionsList } }
    constructor(_key?: string) {}
  }
  return { default: StripeMock }
})

// ── payload mock (hoisted) ──────────────────────────────────────────────────

const find = vi.fn()
const create = vi.fn()
const update = vi.fn()
const del = vi.fn()
const findByID = vi.fn()
const forgotPassword = vi.fn()

const payloadStub = {
  find,
  create,
  update,
  delete: del,
  findByID,
  forgotPassword,
}

vi.mock('payload', () => ({
  getPayload: vi.fn(async () => payloadStub),
}))

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))

// ── side-effect mocks (we don't exercise real Brevo / NDQS / notify) ─────────

const notifyEvent = vi.fn(async () => {})
vi.mock('@/utilities/notify', () => ({ notifyEvent }))

const sendCourseAccessEmail = vi.fn(async () => {})
const sendDownloadLinkEmail = vi.fn(async () => {})
vi.mock('@/utilities/brevo', () => ({ sendCourseAccessEmail, sendDownloadLinkEmail }))

const fulfillAppPurchase = vi.fn(async () => ({ created: true, token: 'tok_x' }))
vi.mock('@/utilities/appsFulfillment', () => ({ fulfillAppPurchase }))

const enrollNdqsByEmail = vi.fn(async () => ({ ok: true, status: 200 }))
vi.mock('@/utilities/ndqsEnroll', () => ({ enrollNdqsByEmail }))

const revokeNdqsByEmail = vi.fn(async () => ({ ok: true, status: 200 }))
vi.mock('@/utilities/ndqsRevoke', () => ({ revokeNdqsByEmail }))

// addProgramToPurchases is a pure helper — keep the real implementation so the
// purchases array we assert on is the genuine normalized/deduped output.

// ── helpers ─────────────────────────────────────────────────────────────────

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig', 'content-type': 'application/json' },
    body: '{}',
  })
}

/** Stage the next constructEvent call to return this event. */
function stageEvent(event: unknown) {
  constructEvent.mockReturnValueOnce(event)
}

function completedEvent(session: Record<string, unknown>, id = 'evt_1') {
  return { id, type: 'checkout.session.completed', data: { object: session } }
}

function refundedEvent(charge: Record<string, unknown>, id = 'evt_refund_1') {
  return { id, type: 'charge.refunded', data: { object: charge } }
}

const BUYER = 'buyer@example.com'

function courseSession(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'cs_course_1',
    payment_status: 'paid',
    amount_total: 4700,
    currency: 'pln',
    customer_details: { email: BUYER },
    metadata: { programId: '16', withdrawalConsentAt: '2026-06-19T00:00:00Z' },
    ...over,
  }
}

function appsSession(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'cs_app_1',
    payment_status: 'paid',
    amount_total: 4900,
    currency: 'pln',
    customer_details: { email: BUYER },
    metadata: { productId: '7', withdrawalConsentAt: '2026-06-19T00:00:00Z' },
    ...over,
  }
}

/**
 * Drive payload.find by collection. The route calls find on:
 *   - stripe-events (idempotency dedupe — return empty so we proceed)
 *   - users (course branch — return the staged user)
 *   - download-grants (refund branch — return the staged grant)
 */
function setFind(opts: {
  user?: Record<string, unknown> | null
  grant?: Record<string, unknown> | null
}) {
  find.mockImplementation(async ({ collection }: { collection: string }) => {
    if (collection === 'stripe-events') return { docs: [] }
    if (collection === 'users') return { docs: opts.user ? [opts.user] : [] }
    if (collection === 'download-grants') return { docs: opts.grant ? [opts.grant] : [] }
    return { docs: [] }
  })
}

const PROGRAM_16 = { id: 16, slug: 'kurs', priceCents: 4700, currency: 'pln' }
const PRODUCT_7 = { id: 7, title: 'App', priceCents: 4900, currency: 'pln' }
// The $1 test fixtures the prompt requires to keep working.
const PROGRAM_17 = { id: 17, slug: 'test-course', priceCents: 100, currency: 'pln' }
const PRODUCT_3 = { id: 3, title: 'Test App', priceCents: 100, currency: 'pln' }

function setFindByID(map: Record<string, Record<string, unknown>>) {
  findByID.mockImplementation(async ({ collection, id }: { collection: string; id: unknown }) => {
    const key = `${collection}:${id}`
    return map[key] ?? null
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x'
  forgotPassword.mockResolvedValue('reset_tok')
  create.mockResolvedValue({ id: 99, email: BUYER })
  update.mockResolvedValue({})
  del.mockResolvedValue({})
  fulfillAppPurchase.mockResolvedValue({ created: true, token: 'tok_x' })
  // Default: no findByID hits unless a test stages them.
  findByID.mockResolvedValue(null)
})

// ── Fix 1: payment_status gate ───────────────────────────────────────────────

describe('Fix 1 — payment_status gate', () => {
  it('does NOT grant a course on an UNPAID completed session', async () => {
    const { POST } = await import('./route')
    setFind({ user: { id: 5, email: BUYER, purchases: [] } })
    setFindByID({ 'program:16': PROGRAM_16 })
    stageEvent(completedEvent(courseSession({ payment_status: 'unpaid' })))

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    // No user grant, no enroll, no app fulfillment.
    expect(update).not.toHaveBeenCalled()
    expect(fulfillAppPurchase).not.toHaveBeenCalled()
    expect(enrollNdqsByEmail).not.toHaveBeenCalled()
    // The event row is still written (clean skip, not an error).
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'stripe-events' }),
    )
  })

  it('does NOT fulfill an app on a $0/unpaid completed session', async () => {
    const { POST } = await import('./route')
    setFind({})
    setFindByID({ 'products:7': PRODUCT_7 })
    stageEvent(
      completedEvent(appsSession({ payment_status: 'unpaid', amount_total: 0 })),
    )

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    expect(fulfillAppPurchase).not.toHaveBeenCalled()
  })
})

// ── Fix 2: amount / currency reconciliation ──────────────────────────────────

describe('Fix 2 — amount/currency reconciliation', () => {
  it('does NOT grant when course amount_total < priceCents, and alerts payment_mismatch', async () => {
    const { POST } = await import('./route')
    setFind({ user: { id: 5, email: BUYER, purchases: [] } })
    setFindByID({ 'program:16': PROGRAM_16 })
    stageEvent(completedEvent(courseSession({ amount_total: 100 }))) // paid 1zł for a 47zł course

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    expect(update).not.toHaveBeenCalled()
    expect(notifyEvent).toHaveBeenCalledWith(
      'payment_mismatch',
      expect.objectContaining({ paid: 100, expected: 4700 }),
    )
  })

  it('GRANTS a course when amount_total >= priceCents and currency matches', async () => {
    const { POST } = await import('./route')
    const user = { id: 5, email: BUYER, purchases: [] }
    setFind({ user })
    setFindByID({ 'program:16': PROGRAM_16 })
    stageEvent(completedEvent(courseSession({ amount_total: 4700 })))

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        id: 5,
        data: expect.objectContaining({ purchases: [16] }),
      }),
    )
    expect(notifyEvent).toHaveBeenCalledWith(
      'purchase',
      expect.objectContaining({ surface: 'courses' }),
    )
  })

  it('GRANTS when amount_total > priceCents (fuller payment, e.g. tax) — uses >=', async () => {
    const { POST } = await import('./route')
    setFind({ user: { id: 5, email: BUYER, purchases: [] } })
    setFindByID({ 'program:16': PROGRAM_16 })
    stageEvent(completedEvent(courseSession({ amount_total: 5000 }))) // 47zł + 3zł tax

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'users', id: 5 }),
    )
  })

  it('does NOT grant on currency mismatch (paid usd for a pln course)', async () => {
    const { POST } = await import('./route')
    setFind({ user: { id: 5, email: BUYER, purchases: [] } })
    setFindByID({ 'program:16': PROGRAM_16 })
    stageEvent(completedEvent(courseSession({ amount_total: 4700, currency: 'usd' })))

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    expect(update).not.toHaveBeenCalled()
    expect(notifyEvent).toHaveBeenCalledWith('payment_mismatch', expect.any(Object))
  })

  it('the $1 test course (program 17, priceCents=100) still fulfills on a $1 payment', async () => {
    const { POST } = await import('./route')
    setFind({ user: { id: 8, email: BUYER, purchases: [] } })
    setFindByID({ 'program:17': PROGRAM_17 })
    stageEvent(
      completedEvent(
        courseSession({ amount_total: 100, metadata: { programId: '17' } }),
      ),
    )

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ purchases: [17] }) }),
    )
  })

  it('GRANTS an app when amount_total >= priceCents', async () => {
    const { POST } = await import('./route')
    setFind({})
    setFindByID({ 'products:7': PRODUCT_7 })
    stageEvent(completedEvent(appsSession({ amount_total: 4900 })))

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    expect(fulfillAppPurchase).toHaveBeenCalledWith(
      payloadStub,
      expect.objectContaining({ productId: 7, email: BUYER }),
    )
  })

  it('does NOT fulfill an app when amount_total < priceCents, and alerts', async () => {
    const { POST } = await import('./route')
    setFind({})
    setFindByID({ 'products:7': PRODUCT_7 })
    stageEvent(completedEvent(appsSession({ amount_total: 100 }))) // 1zł for a 49zł app

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    expect(fulfillAppPurchase).not.toHaveBeenCalled()
    expect(notifyEvent).toHaveBeenCalledWith(
      'payment_mismatch',
      expect.objectContaining({ paid: 100, expected: 4900 }),
    )
  })

  it('the $1 test app (product 3, priceCents=100) still fulfills on a $1 payment', async () => {
    const { POST } = await import('./route')
    setFind({})
    setFindByID({ 'products:3': PRODUCT_3 })
    stageEvent(
      completedEvent(appsSession({ amount_total: 100, metadata: { productId: '3' } })),
    )

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    expect(fulfillAppPurchase).toHaveBeenCalledWith(
      payloadStub,
      expect.objectContaining({ productId: 3 }),
    )
  })

  it('falls back to the Stripe Price when priceCents is absent (stripePriceId path)', async () => {
    const { POST } = await import('./route')
    setFind({ user: { id: 5, email: BUYER, purchases: [] } })
    setFindByID({ 'program:16': { id: 16, slug: 'kurs', stripePriceId: 'price_abc' } })
    pricesRetrieve.mockResolvedValue({ unit_amount: 4700, currency: 'pln' })
    stageEvent(completedEvent(courseSession({ amount_total: 4700 })))

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    expect(pricesRetrieve).toHaveBeenCalledWith('price_abc')
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'users', id: 5 }),
    )
  })

  it('does NOT grant when neither priceCents nor stripePriceId is set (cannot verify)', async () => {
    const { POST } = await import('./route')
    setFind({ user: { id: 5, email: BUYER, purchases: [] } })
    setFindByID({ 'program:16': { id: 16, slug: 'kurs' } }) // no price info
    stageEvent(completedEvent(courseSession({ amount_total: 4700 })))

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    expect(update).not.toHaveBeenCalled()
    expect(notifyEvent).toHaveBeenCalledWith('payment_mismatch', expect.any(Object))
  })
})

// ── Fix 3: refund revokes courses + apps ─────────────────────────────────────

describe('Fix 3 — refund revokes courses + apps', () => {
  it('removes a refunded programId from the user purchases', async () => {
    const { POST } = await import('./route')
    const user = { id: 5, email: BUYER, purchases: [16, 22] }
    setFind({ user })
    sessionsList.mockResolvedValue({
      data: [
        {
          id: 'cs_course_1',
          customer_details: { email: BUYER },
          metadata: { programId: '16' },
        },
      ],
    })
    stageEvent(refundedEvent({ payment_intent: 'pi_1' }))

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    // Program 16 removed; 22 retained.
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        id: 5,
        data: expect.objectContaining({ purchases: [22] }),
      }),
    )
    expect(notifyEvent).toHaveBeenCalledWith('refund', expect.any(Object))
  })

  it('expires/deletes the download-grant for a refunded productId', async () => {
    const { POST } = await import('./route')
    const grant = { id: 77, stripeSessionId: 'cs_app_1', product: 7 }
    setFind({ grant })
    sessionsList.mockResolvedValue({
      data: [
        {
          id: 'cs_app_1',
          customer_details: { email: BUYER },
          metadata: { productId: '7' },
        },
      ],
    })
    stageEvent(refundedEvent({ payment_intent: 'pi_2' }))

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    // Either expired (update with past expiresAt) or deleted — accept both.
    const expired = update.mock.calls.some(
      ([arg]) => arg?.collection === 'download-grants' && arg?.id === 77,
    )
    const deleted = del.mock.calls.some(
      ([arg]) => arg?.collection === 'download-grants' && arg?.id === 77,
    )
    expect(expired || deleted).toBe(true)
  })

  it('still revokes NDQS on refund (existing behavior preserved)', async () => {
    const { POST } = await import('./route')
    setFind({})
    sessionsList.mockResolvedValue({
      data: [
        {
          id: 'cs_ndqs_1',
          customer_details: { email: BUYER },
          metadata: { ndqsCourseId: 'course_x' },
        },
      ],
    })
    stageEvent(refundedEvent({ payment_intent: 'pi_3' }))

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    expect(revokeNdqsByEmail).toHaveBeenCalledWith({
      email: BUYER,
      courseId: 'course_x',
    })
  })
})

// ── NDQS branch: paid gate only, no Payload price ────────────────────────────

describe('NDQS branch — payment_status gate only', () => {
  it('enrolls a paid NDQS session (no amount reconciliation)', async () => {
    const { POST } = await import('./route')
    setFind({})
    stageEvent(
      completedEvent({
        id: 'cs_ndqs_1',
        payment_status: 'paid',
        amount_total: 1, // arbitrary — fixed on the owner's Payment Link, not checked
        currency: 'pln',
        customer_details: { email: BUYER },
        metadata: { ndqsCourseId: 'course_x' },
      }),
    )

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    expect(enrollNdqsByEmail).toHaveBeenCalledWith({
      email: BUYER,
      courseId: 'course_x',
    })
  })

  it('does NOT enroll an unpaid NDQS session', async () => {
    const { POST } = await import('./route')
    setFind({})
    stageEvent(
      completedEvent({
        id: 'cs_ndqs_2',
        payment_status: 'unpaid',
        customer_details: { email: BUYER },
        metadata: { ndqsCourseId: 'course_x' },
      }),
    )

    const res = await POST(makeReq())

    expect(res.status).toBe(200)
    expect(enrollNdqsByEmail).not.toHaveBeenCalled()
  })
})
