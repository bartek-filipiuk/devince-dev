/**
 * Tests for the external products API routes — accessMode field.
 *
 * Harness mirrors programs.test.ts: mock _lib/payload.js, pass Bearer token.
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

// ── accessMode — POST ──────────────────────────────────────────────────────

describe('POST /api/external/products — accessMode', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('forwards accessMode:lead-magnet to payload.create', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const create = vi.fn().mockResolvedValue({
      id: 100,
      title: 'Lead Magnet Product',
      slug: 'lead-magnet-product',
      priceCents: 0,
      currency: 'pln',
      _status: 'draft',
    })
    vi.mocked(getPayloadClient).mockResolvedValue({ create } as never)

    const { POST } = await import('./route.js')

    const req = makeAuthedReq('POST', 'http://localhost/api/external/products', {
      title: 'Lead Magnet Product',
      priceCents: 0,
      currency: 'pln',
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
      id: 101,
      title: 'Paid Product',
      slug: 'paid-product',
      priceCents: 4900,
      currency: 'pln',
      _status: 'draft',
    })
    vi.mocked(getPayloadClient).mockResolvedValue({ create } as never)

    const { POST } = await import('./route.js')

    const req = makeAuthedReq('POST', 'http://localhost/api/external/products', {
      title: 'Paid Product',
      priceCents: 4900,
      currency: 'pln',
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
      id: 102,
      title: 'No AccessMode',
      slug: 'no-access-mode',
      priceCents: 1000,
      currency: 'pln',
      _status: 'draft',
    })
    vi.mocked(getPayloadClient).mockResolvedValue({ create } as never)

    const { POST } = await import('./route.js')

    const req = makeAuthedReq('POST', 'http://localhost/api/external/products', {
      title: 'No AccessMode',
      priceCents: 1000,
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

    const req = makeAuthedReq('POST', 'http://localhost/api/external/products', {
      title: 'Bad AccessMode',
      priceCents: 1000,
      accessMode: 'foo',
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ── accessMode — PATCH ─────────────────────────────────────────────────────

describe('PATCH /api/external/products/[idOrSlug] — accessMode', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('forwards accessMode to payload.update', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const update = vi.fn().mockResolvedValue({
      id: 200,
      title: 'Updated Product',
      slug: 'updated-product',
      priceCents: 0,
      currency: 'pln',
      _status: 'draft',
      downloadFiles: null,
    })
    const findByID = vi.fn().mockResolvedValue({ id: 200 })
    vi.mocked(getPayloadClient).mockResolvedValue({ update, findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = makeAuthedReq(
      'PATCH',
      'http://localhost/api/external/products/200',
      { accessMode: 'lead-magnet' },
    )

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: '200' }) })
    expect(res.status).toBe(200)

    expect(update).toHaveBeenCalledOnce()
    const data = update.mock.calls[0][0].data
    expect(data.accessMode).toBe('lead-magnet')
  })

  it('omits accessMode when not provided in PATCH', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const update = vi.fn().mockResolvedValue({
      id: 201,
      title: 'No Change',
      slug: 'no-change',
      priceCents: 500,
      currency: 'pln',
      _status: 'draft',
      downloadFiles: null,
    })
    const findByID = vi.fn().mockResolvedValue({ id: 201 })
    vi.mocked(getPayloadClient).mockResolvedValue({ update, findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = makeAuthedReq(
      'PATCH',
      'http://localhost/api/external/products/201',
      { priceCents: 500 },
    )

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: '201' }) })
    expect(res.status).toBe(200)

    const data = update.mock.calls[0][0].data
    expect(data).not.toHaveProperty('accessMode')
  })

  it('returns 400 for invalid accessMode in PATCH', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const findByID = vi.fn().mockResolvedValue({ id: 202 })
    vi.mocked(getPayloadClient).mockResolvedValue({ findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = makeAuthedReq(
      'PATCH',
      'http://localhost/api/external/products/202',
      { accessMode: 'bar' },
    )

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: '202' }) })
    expect(res.status).toBe(400)
  })
})
