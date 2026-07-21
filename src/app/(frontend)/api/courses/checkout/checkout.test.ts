/**
 * Tests for POST /api/courses/checkout — the courses twin of the apps checkout.
 *
 * Harness notes:
 * - The route calls `getPayload({ config })` (from `payload`) then `.find(...)`
 *   to load the Program by slug. We mock the `payload` module so `getPayload`
 *   resolves a stub exposing a `find` spy we control per-test.
 * - The route constructs `new Stripe(...)` lazily and calls
 *   `checkout.sessions.create`. We mock the `stripe` default export to a class
 *   whose instances expose a shared `sessions.create` spy, so we can assert the
 *   metadata + URLs passed to Stripe.
 * - NextRequest needs a full URL in Node env. We use `http://localhost/...`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── module mocks (hoisted) ─────────────────────────────────────────────────

const sessionsCreate = vi.fn()

vi.mock('stripe', () => {
  // The route does `new Stripe(key)` then `.checkout.sessions.create(...)`.
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

// `@payload-config` resolves to the heavy Payload config at import time; stub it
// so importing the route doesn't pull the whole CMS into the test.
vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))

// ── helpers ────────────────────────────────────────────────────────────────

function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/courses/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockProgram(program: Record<string, unknown> | null) {
  find.mockResolvedValue({ docs: program ? [program] : [] })
}

const PAID_PROGRAM = {
  id: 16,
  title: 'Pro Phase 2',
  pricing: 'paid',
  priceCents: 4700,
  currency: 'pln',
  stripePriceId: 'price_1',
  slug: 'kurs',
}

// ── tests ──────────────────────────────────────────────────────────────────

describe('POST /api/courses/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    sessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/x' })
  })

  it('rejects without consent (400)', async () => {
    const { POST } = await import('./route')
    mockProgram(PAID_PROGRAM)
    const res = await POST(makeReq({ slug: 'kurs', consent: false, locale: 'pl' }))
    expect(res.status).toBe(400)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it('rejects unknown program (404)', async () => {
    const { POST } = await import('./route')
    mockProgram(null)
    const res = await POST(makeReq({ slug: 'nope', consent: true, locale: 'pl' }))
    expect(res.status).toBe(404)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it('creates a session with programId + server-stamped consent metadata', async () => {
    const { POST } = await import('./route')
    mockProgram(PAID_PROGRAM)
    const res = await POST(makeReq({ slug: 'kurs', consent: true, locale: 'pl' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.com/x' })

    expect(sessionsCreate).toHaveBeenCalledOnce()
    const arg = sessionsCreate.mock.calls[0][0]
    expect(arg.metadata.programId).toBe('16')
    expect(arg.metadata.withdrawalConsent).toBe('true')
    expect(typeof arg.metadata.withdrawalConsentAt).toBe('string')
    expect(arg.metadata.locale).toBe('pl')
    // success_url -> courses "check your email" page; cancel_url -> back to slug.
    expect(arg.success_url).toMatch(/\/success$/)
    expect(arg.cancel_url).toMatch(/\/kurs$/)
  })

  it('terms-only program stamps termsConsent* and NO withdrawal waiver', async () => {
    const { POST } = await import('./route')
    // Reservation-style purchase: buyer accepts terms only — the metadata must
    // never claim an Art. 38 withdrawal waiver they did not give.
    mockProgram({ ...PAID_PROGRAM, checkoutConsentMode: 'terms-only' })
    const res = await POST(makeReq({ slug: 'kurs', consent: true, locale: 'pl' }))
    expect(res.status).toBe(200)

    const arg = sessionsCreate.mock.calls[0][0]
    expect(arg.metadata.termsConsent).toBe('true')
    expect(typeof arg.metadata.termsConsentAt).toBe('string')
    expect(arg.metadata.withdrawalConsent).toBeUndefined()
    expect(arg.metadata.withdrawalConsentAt).toBeUndefined()
  })

  it('form POST (external landing) redirects 303 to Stripe and honors the consent gate', async () => {
    const { POST } = await import('./route')
    mockProgram({ ...PAID_PROGRAM, checkoutConsentMode: 'terms-only' })

    const makeForm = (body: string) =>
      new NextRequest('http://localhost/api/courses/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      })

    // Without the checkbox the server gate must still refuse — the browser's
    // `required` is UX, THIS is the legal gate.
    const denied = await POST(makeForm('slug=kurs&locale=pl'))
    expect(denied.status).toBe(400)
    expect(sessionsCreate).not.toHaveBeenCalled()

    const res = await POST(makeForm('slug=kurs&consent=on&locale=pl'))
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe('https://checkout.stripe.com/x')
    const arg = sessionsCreate.mock.calls[0][0]
    expect(arg.metadata.termsConsent).toBe('true')
    expect(arg.metadata.withdrawalConsent).toBeUndefined()
  })

  it('rejects a free/un-priced program (400)', async () => {
    const { POST } = await import('./route')
    mockProgram({ id: 9, title: 'Free', pricing: 'free', slug: 'free' })
    const res = await POST(makeReq({ slug: 'free', consent: true, locale: 'pl' }))
    expect(res.status).toBe(400)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })
})
