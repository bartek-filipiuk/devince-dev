/**
 * Tests for the external programs API routes.
 *
 * Harness notes:
 * - `getPayloadClient` is exported from `./_lib/payload.ts` and called inside
 *   the route. We mock the entire `_lib/payload.js` module to intercept it.
 * - Auth is handled by `validateAuth` (from `_lib/auth.ts`), which reads
 *   `process.env.EXTERNAL_API_TOKEN` and compares via HMAC. We set the env var
 *   and send `Bearer <token>` so the check passes.
 * - NextRequest needs a full URL (Node env). We use `http://localhost/api/...`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── module mocks (hoisted) ─────────────────────────────────────────────────

vi.mock('../_lib/payload.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../_lib/payload.js')>()
  return {
    ...original,
    getPayloadClient: vi.fn(),
  }
})

// ── helpers ────────────────────────────────────────────────────────────────

const TOKEN = 'test-secret-token-32-chars-long!!'

function makeAuthedReq(
  method: string,
  url: string,
  body: Record<string, unknown>,
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body),
  })
}

// ── POST /api/external/programs ────────────────────────────────────────────

describe('POST /api/external/programs', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('forwards priceCents/currency/stripe fields to payload.create', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const create = vi.fn().mockResolvedValue({
      id: 1,
      title: 'X',
      slug: 'x',
      _status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    vi.mocked(getPayloadClient).mockResolvedValue({ create } as never)

    const { POST } = await import('./route.js')

    const req = makeAuthedReq('POST', 'http://localhost/api/external/programs', {
      title: 'X',
      type: 'course',
      pricing: 'paid',
      priceCents: 4700,
      currency: 'pln',
      stripePaymentLink: 'https://buy.stripe.com/x',
      stripePriceId: 'price_1',
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    expect(create).toHaveBeenCalledOnce()
    const data = create.mock.calls[0][0].data
    expect(data.priceCents).toBe(4700)
    expect(data.currency).toBe('pln')
    expect(data.stripePaymentLink).toBe('https://buy.stripe.com/x')
    expect(data.stripePriceId).toBe('price_1')
  })

  it('omits priceCents/currency/stripe fields when not provided', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const create = vi.fn().mockResolvedValue({
      id: 2,
      title: 'Y',
      slug: 'y',
      _status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    vi.mocked(getPayloadClient).mockResolvedValue({ create } as never)

    const { POST } = await import('./route.js')

    const req = makeAuthedReq('POST', 'http://localhost/api/external/programs', {
      title: 'Y',
      type: 'workshop',
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    const data = create.mock.calls[0][0].data
    expect(data).not.toHaveProperty('priceCents')
    expect(data).not.toHaveProperty('currency')
    expect(data).not.toHaveProperty('stripePaymentLink')
    expect(data).not.toHaveProperty('stripePriceId')
  })
})

// ── PATCH /api/external/programs/[idOrSlug] ────────────────────────────────

describe('PATCH /api/external/programs/[idOrSlug]', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('forwards priceCents and currency to payload.update', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const update = vi.fn().mockResolvedValue({
      id: 3,
      title: 'Z',
      slug: 'z',
      _status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    const findByID = vi.fn().mockResolvedValue({ id: 3 })
    vi.mocked(getPayloadClient).mockResolvedValue({ update, findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = makeAuthedReq(
      'PATCH',
      'http://localhost/api/external/programs/3',
      { priceCents: 9900, currency: 'eur' },
    )

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: '3' }) })
    expect(res.status).toBe(200)

    expect(update).toHaveBeenCalledOnce()
    const data = update.mock.calls[0][0].data
    expect(data.priceCents).toBe(9900)
    expect(data.currency).toBe('eur')
  })

  it('omits priceCents/currency when not provided in PATCH', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const update = vi.fn().mockResolvedValue({
      id: 4,
      title: 'W',
      slug: 'w',
      _status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    const findByID = vi.fn().mockResolvedValue({ id: 4 })
    vi.mocked(getPayloadClient).mockResolvedValue({ update, findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = makeAuthedReq(
      'PATCH',
      'http://localhost/api/external/programs/4',
      { title: 'Updated title' },
    )

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: '4' }) })
    expect(res.status).toBe(200)

    const data = update.mock.calls[0][0].data
    expect(data).not.toHaveProperty('priceCents')
    expect(data).not.toHaveProperty('currency')
  })
})
