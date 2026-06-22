/**
 * Tests for the external roadmap API. Harness mirrors header.test.ts:
 * mock _lib/payload.js getPayloadClient, pass Bearer token.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('../_lib/payload.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../_lib/payload.js')>()
  return { ...original, getPayloadClient: vi.fn() }
})

const TOKEN = 'test-secret-token-32-chars-long!!'

function makeAuthedReq(method: string, url: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const ITEM = (title: string, extra: Record<string, unknown> = {}) => ({
  title,
  status: 'planned',
  track: 'general',
  ...extra,
})

describe('GET /api/external/roadmap', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('returns items at the requested locale', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const findGlobal = vi.fn().mockResolvedValue({ items: [ITEM('Roadmapa')] })
    vi.mocked(getPayloadClient).mockResolvedValue({ findGlobal } as never)

    const { GET } = await import('./route.js')
    const res = await GET(makeAuthedReq('GET', 'http://localhost/api/external/roadmap?locale=pl'))
    expect(res.status).toBe(200)
    expect(findGlobal.mock.calls[0][0]).toMatchObject({ slug: 'roadmap', locale: 'pl' })
    expect((await res.json()).data.items).toHaveLength(1)
  })
})

describe('PATCH /api/external/roadmap', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  function setup(existing: Array<Record<string, unknown>> = []) {
    const findGlobal = vi.fn().mockResolvedValue({ items: existing })
    const updateGlobal = vi.fn().mockResolvedValue({ items: existing })
    return { findGlobal, updateGlobal }
  }

  it('forwards items + ?locale=en to updateGlobal', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const { findGlobal, updateGlobal } = setup()
    vi.mocked(getPayloadClient).mockResolvedValue({ findGlobal, updateGlobal } as never)

    const { PATCH } = await import('./route.js')
    const items = [ITEM('Done thing', { status: 'done' })]
    const res = await PATCH(makeAuthedReq('PATCH', 'http://localhost/api/external/roadmap?locale=en', { items }))
    expect(res.status).toBe(200)
    expect(updateGlobal.mock.calls[0][0]).toMatchObject({ slug: 'roadmap', locale: 'en' })
    expect(updateGlobal.mock.calls[0][0].data.items).toHaveLength(1)
  })

  it('passes items through, honoring caller-provided ids and leaving id-less items new', async () => {
    // The caller carries existing ids (from a prior GET/PATCH) so Payload matches
    // rows by id and preserves the other locale's text; items without an id are new.
    const { getPayloadClient } = await import('../_lib/payload.js')
    const { findGlobal, updateGlobal } = setup()
    vi.mocked(getPayloadClient).mockResolvedValue({ findGlobal, updateGlobal } as never)

    const { PATCH } = await import('./route.js')
    const items = [ITEM('Existing', { id: 'row-1' }), ITEM('New')]
    const res = await PATCH(makeAuthedReq('PATCH', 'http://localhost/api/external/roadmap?locale=en', { items }))
    expect(res.status).toBe(200)
    const sent = updateGlobal.mock.calls[0][0].data.items
    expect(sent[0].id).toBe('row-1')
    expect(sent[1].id).toBeUndefined()
  })

  it('returns 400 when items is not an array', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    vi.mocked(getPayloadClient).mockResolvedValue({} as never)
    const { PATCH } = await import('./route.js')
    const res = await PATCH(makeAuthedReq('PATCH', 'http://localhost/api/external/roadmap', { items: 'nope' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid ?locale', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const { findGlobal, updateGlobal } = setup()
    vi.mocked(getPayloadClient).mockResolvedValue({ findGlobal, updateGlobal } as never)
    const { PATCH } = await import('./route.js')
    const res = await PATCH(makeAuthedReq('PATCH', 'http://localhost/api/external/roadmap?locale=de', { items: [] }))
    expect(res.status).toBe(400)
    expect(updateGlobal).not.toHaveBeenCalled()
  })
})
