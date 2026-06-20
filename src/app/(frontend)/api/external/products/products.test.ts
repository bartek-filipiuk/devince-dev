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

// ── locale forwarding — PATCH ──────────────────────────────────────────────
// Localized fields (title, description, tier tagline + features) must be
// written to the locale named by ?locale=. Without this the products route
// silently wrote every locale to 'pl' (the bug that made the EN product page
// fall back to the Polish-locale English copy).

describe('PATCH /api/external/products/[idOrSlug] — locale', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  function setup() {
    const update = vi.fn().mockResolvedValue({
      id: 300,
      title: 'Localized Product',
      slug: 'localized-product',
      priceCents: 4900,
      currency: 'usd',
      _status: 'published',
      downloadFiles: null,
    })
    const findByID = vi.fn().mockResolvedValue({ id: 300 })
    return { update, findByID }
  }

  it('forwards ?locale=en to payload.update', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const { update, findByID } = setup()
    vi.mocked(getPayloadClient).mockResolvedValue({ update, findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = makeAuthedReq(
      'PATCH',
      'http://localhost/api/external/products/300?locale=en',
      { title: 'Localized Product' },
    )

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: '300' }) })
    expect(res.status).toBe(200)
    expect(update.mock.calls[0][0].locale).toBe('en')
  })

  it('defaults locale to pl when ?locale omitted', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const { update, findByID } = setup()
    vi.mocked(getPayloadClient).mockResolvedValue({ update, findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = makeAuthedReq(
      'PATCH',
      'http://localhost/api/external/products/300',
      { title: 'Localized Product' },
    )

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: '300' }) })
    expect(res.status).toBe(200)
    expect(update.mock.calls[0][0].locale).toBe('pl')
  })

  it('returns 400 for an invalid ?locale', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const { update, findByID } = setup()
    vi.mocked(getPayloadClient).mockResolvedValue({ update, findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = makeAuthedReq(
      'PATCH',
      'http://localhost/api/external/products/300?locale=de',
      { title: 'Localized Product' },
    )

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: '300' }) })
    expect(res.status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })
})

// ── tiers row-id preservation — PATCH ──────────────────────────────────────
// `tiers` is a non-localized array with localized subfields. Writing it at a
// second locale WITHOUT row ids makes Payload replace the array and drop the
// other locale's tagline/features. The route carries existing ids forward by
// position so per-locale writes update only this locale's text.

describe('PATCH /api/external/products/[idOrSlug] — tier id preservation', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('injects existing tier row ids by position when writing tiers', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const update = vi.fn().mockResolvedValue({
      id: 400,
      title: 'Tiered',
      slug: 'tiered',
      priceCents: 4900,
      currency: 'usd',
      _status: 'published',
      downloadFiles: null,
    })
    // resolveDocId + the tier-id lookup both call findByID; return the existing
    // rows so position 0 -> 'row-a', position 1 -> 'row-b'.
    const findByID = vi.fn().mockResolvedValue({
      id: 400,
      tiers: [{ id: 'row-a' }, { id: 'row-b' }],
    })
    vi.mocked(getPayloadClient).mockResolvedValue({ update, findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = makeAuthedReq(
      'PATCH',
      'http://localhost/api/external/products/400?locale=en',
      {
        tiers: [
          { name: 'Starter', priceCents: 4900, currency: 'usd', tagline: 'EN a' },
          { name: 'Pro', priceCents: 9900, currency: 'usd', tagline: 'EN b' },
        ],
      },
    )

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: '400' }) })
    expect(res.status).toBe(200)

    const sentTiers = update.mock.calls[0][0].data.tiers
    expect(sentTiers[0].id).toBe('row-a')
    expect(sentTiers[1].id).toBe('row-b')
    // non-localized values still forwarded from the request body
    expect(sentTiers[0].priceCents).toBe(4900)
    expect(update.mock.calls[0][0].locale).toBe('en')
  })

  it('does not inject ids when there are no existing tier rows', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const update = vi.fn().mockResolvedValue({
      id: 401,
      title: 'Fresh',
      slug: 'fresh',
      priceCents: 4900,
      currency: 'usd',
      _status: 'published',
      downloadFiles: null,
    })
    const findByID = vi.fn().mockResolvedValue({ id: 401 }) // no tiers yet
    vi.mocked(getPayloadClient).mockResolvedValue({ update, findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = makeAuthedReq(
      'PATCH',
      'http://localhost/api/external/products/401?locale=pl',
      { tiers: [{ name: 'Starter', priceCents: 4900, currency: 'usd', tagline: 'PL a' }] },
    )

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: '401' }) })
    expect(res.status).toBe(200)

    const sentTiers = update.mock.calls[0][0].data.tiers
    expect(sentTiers[0]).not.toHaveProperty('id')
  })
})
