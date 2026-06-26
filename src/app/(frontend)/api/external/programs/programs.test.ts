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

// ── DELETE /api/external/programs/[idOrSlug] ───────────────────────────────

describe('DELETE /api/external/programs/[idOrSlug]', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('DELETE removes the program', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const del = vi.fn().mockResolvedValue({ id: 16 })
    const findByID = vi.fn().mockResolvedValue({ id: 16 })
    vi.mocked(getPayloadClient).mockResolvedValue({ delete: del, findByID } as never)

    const { DELETE } = await import('./[idOrSlug]/route.js')

    const authedReq = makeAuthedReq('DELETE', 'http://localhost/api/external/programs/16', {})
    const res = await DELETE(authedReq, { params: Promise.resolve({ idOrSlug: '16' }) })
    expect(del).toHaveBeenCalledWith(expect.objectContaining({ collection: 'program', id: 16, overrideAccess: true }))
    expect(res.status).toBe(200)
  })

  it('DELETE without token is 401', async () => {
    const { DELETE } = await import('./[idOrSlug]/route.js')

    const unauthedReq = new NextRequest('http://localhost/api/external/programs/16', {
      method: 'DELETE',
    })
    const res = await DELETE(unauthedReq, { params: Promise.resolve({ idOrSlug: '16' }) })
    expect(res.status).toBe(401)
  })
})

// ── featured — POST ───────────────────────────────────────────────────────

describe('POST /api/external/programs — featured', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('forwards featured to payload.create', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const create = vi.fn().mockResolvedValue({
      id: 9, title: 'F', slug: 'f', _status: 'draft',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    vi.mocked(getPayloadClient).mockResolvedValue({ create } as never)
    const { POST } = await import('./route.js')
    const req = makeAuthedReq('POST', 'http://localhost/api/external/programs', {
      title: 'F', type: 'course', featured: true,
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(create.mock.calls[0][0].data.featured).toBe(true)
  })

  it('forwards featured:false to payload.create', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const create = vi.fn().mockResolvedValue({
      id: 9, title: 'F', slug: 'f', _status: 'draft',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    vi.mocked(getPayloadClient).mockResolvedValue({ create } as never)
    const { POST } = await import('./route.js')
    const req = makeAuthedReq('POST', 'http://localhost/api/external/programs', {
      title: 'F', type: 'course', featured: false,
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(create.mock.calls[0][0].data.featured).toBe(false)
  })
})

// ── featured — PATCH ──────────────────────────────────────────────────────

describe('PATCH /api/external/programs/[idOrSlug] — featured', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('forwards featured to payload.update', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const update = vi.fn().mockResolvedValue({
      id: 30,
      title: 'Featured Test',
      slug: 'featured-test',
      _status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    const findByID = vi.fn().mockResolvedValue({ id: 30 })
    vi.mocked(getPayloadClient).mockResolvedValue({ update, findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = makeAuthedReq(
      'PATCH',
      'http://localhost/api/external/programs/30',
      { featured: true },
    )

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: '30' }) })
    expect(res.status).toBe(200)

    expect(update).toHaveBeenCalledOnce()
    expect(update.mock.calls[0][0].data.featured).toBe(true)
  })

  it('forwards featured:false to payload.update', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const update = vi.fn().mockResolvedValue({
      id: 30,
      title: 'Featured Test',
      slug: 'featured-test',
      _status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    const findByID = vi.fn().mockResolvedValue({ id: 30 })
    vi.mocked(getPayloadClient).mockResolvedValue({ update, findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = makeAuthedReq(
      'PATCH',
      'http://localhost/api/external/programs/30',
      { featured: false },
    )

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: '30' }) })
    expect(res.status).toBe(200)

    expect(update).toHaveBeenCalledOnce()
    expect(update.mock.calls[0][0].data.featured).toBe(false)
  })
})

// ── accessMode — POST ──────────────────────────────────────────────────────

describe('POST /api/external/programs — accessMode', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('forwards accessMode:lead-magnet to payload.create', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const create = vi.fn().mockResolvedValue({
      id: 10,
      title: 'Lead Magnet Course',
      slug: 'lead-magnet-course',
      _status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    vi.mocked(getPayloadClient).mockResolvedValue({ create } as never)

    const { POST } = await import('./route.js')

    const req = makeAuthedReq('POST', 'http://localhost/api/external/programs', {
      title: 'Lead Magnet Course',
      type: 'course',
      accessMode: 'lead-magnet',
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    expect(create).toHaveBeenCalledOnce()
    const data = create.mock.calls[0][0].data
    expect(data.accessMode).toBe('lead-magnet')
  })

  it('forwards accessMode:paid to payload.create', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const create = vi.fn().mockResolvedValue({
      id: 11,
      title: 'Paid Course',
      slug: 'paid-course',
      _status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    vi.mocked(getPayloadClient).mockResolvedValue({ create } as never)

    const { POST } = await import('./route.js')

    const req = makeAuthedReq('POST', 'http://localhost/api/external/programs', {
      title: 'Paid Course',
      type: 'course',
      accessMode: 'paid',
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    const data = create.mock.calls[0][0].data
    expect(data.accessMode).toBe('paid')
  })

  it('omits accessMode when not provided', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const create = vi.fn().mockResolvedValue({
      id: 12,
      title: 'No AccessMode',
      slug: 'no-access-mode',
      _status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    vi.mocked(getPayloadClient).mockResolvedValue({ create } as never)

    const { POST } = await import('./route.js')

    const req = makeAuthedReq('POST', 'http://localhost/api/external/programs', {
      title: 'No AccessMode',
      type: 'workshop',
    })

    const res = await POST(req)
    expect(res.status).toBe(201)

    const data = create.mock.calls[0][0].data
    expect(data).not.toHaveProperty('accessMode')
  })

  it('returns 400 for invalid accessMode', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    vi.mocked(getPayloadClient).mockResolvedValue({} as never)

    const { POST } = await import('./route.js')

    const req = makeAuthedReq('POST', 'http://localhost/api/external/programs', {
      title: 'Bad AccessMode',
      type: 'course',
      accessMode: 'foo',
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ── accessMode — PATCH ─────────────────────────────────────────────────────

describe('PATCH /api/external/programs/[idOrSlug] — accessMode', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('forwards accessMode to payload.update', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const update = vi.fn().mockResolvedValue({
      id: 20,
      title: 'Updated',
      slug: 'updated',
      _status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    const findByID = vi.fn().mockResolvedValue({ id: 20 })
    vi.mocked(getPayloadClient).mockResolvedValue({ update, findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = makeAuthedReq(
      'PATCH',
      'http://localhost/api/external/programs/20',
      { accessMode: 'lead-magnet' },
    )

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: '20' }) })
    expect(res.status).toBe(200)

    expect(update).toHaveBeenCalledOnce()
    const data = update.mock.calls[0][0].data
    expect(data.accessMode).toBe('lead-magnet')
  })

  it('omits accessMode when not provided in PATCH', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const update = vi.fn().mockResolvedValue({
      id: 21,
      title: 'No Change',
      slug: 'no-change',
      _status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    const findByID = vi.fn().mockResolvedValue({ id: 21 })
    vi.mocked(getPayloadClient).mockResolvedValue({ update, findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = makeAuthedReq(
      'PATCH',
      'http://localhost/api/external/programs/21',
      { title: 'New Title' },
    )

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: '21' }) })
    expect(res.status).toBe(200)

    const data = update.mock.calls[0][0].data
    expect(data).not.toHaveProperty('accessMode')
  })

  it('returns 400 for invalid accessMode in PATCH', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const findByID = vi.fn().mockResolvedValue({ id: 22 })
    vi.mocked(getPayloadClient).mockResolvedValue({ findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = makeAuthedReq(
      'PATCH',
      'http://localhost/api/external/programs/22',
      { accessMode: 'bar' },
    )

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: '22' }) })
    expect(res.status).toBe(400)
  })
})

// ── GET /api/external/programs (list) ──────────────────────────────────────

describe('GET /api/external/programs', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  function makeGetReq(url: string, authed = true): NextRequest {
    return new NextRequest(url, {
      method: 'GET',
      headers: authed ? { authorization: `Bearer ${TOKEN}` } : {},
    })
  }

  it('returns 200 with data.items', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const find = vi.fn().mockResolvedValue({
      docs: [{ id: 1 }],
      page: 1,
      limit: 20,
      totalDocs: 1,
      totalPages: 1,
    })
    vi.mocked(getPayloadClient).mockResolvedValue({ find } as never)

    const { GET } = await import('./route.js')

    const res = await GET(makeGetReq('http://localhost/api/external/programs'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.items).toEqual([{ id: 1 }])
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ collection: 'program' }))
  })

  it('returns 401 without a Bearer token', async () => {
    const { GET } = await import('./route.js')
    const res = await GET(makeGetReq('http://localhost/api/external/programs', false))
    expect(res.status).toBe(401)
  })
})

// ── GET /api/external/programs/[idOrSlug] ──────────────────────────────────

describe('GET /api/external/programs/[idOrSlug]', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  function makeGetReq(url: string): NextRequest {
    return new NextRequest(url, {
      method: 'GET',
      headers: { authorization: `Bearer ${TOKEN}` },
    })
  }

  it('returns 200 with data.id for a numeric id', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const findByID = vi.fn().mockResolvedValue({ id: 7 })
    vi.mocked(getPayloadClient).mockResolvedValue({ findByID } as never)

    const { GET } = await import('./[idOrSlug]/route.js')

    const res = await GET(makeGetReq('http://localhost/api/external/programs/7'), {
      params: Promise.resolve({ idOrSlug: '7' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe(7)
  })

  it('returns 404 for a missing slug', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const find = vi.fn().mockResolvedValue({ docs: [] })
    vi.mocked(getPayloadClient).mockResolvedValue({ find } as never)

    const { GET } = await import('./[idOrSlug]/route.js')

    const res = await GET(makeGetReq('http://localhost/api/external/programs/nope'), {
      params: Promise.resolve({ idOrSlug: 'nope' }),
    })
    expect(res.status).toBe(404)
  })
})
