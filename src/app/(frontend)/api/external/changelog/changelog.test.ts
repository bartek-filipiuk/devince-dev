/**
 * Tests for the external changelog API. Harness mirrors roadmap.test.ts:
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

const ENTRY = (extra: Record<string, unknown> = {}) => ({
  date: '2026-06-25T10:00:00.000Z',
  notes: [{ text: 'Apps: order bumps', tag: 'apps' }],
  ...extra,
})

describe('GET /api/external/changelog', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('requires a Bearer token', async () => {
    const { GET } = await import('./route.js')
    const res = await GET(new NextRequest('http://localhost/api/external/changelog'))
    expect(res.status).toBe(401)
  })

  it('returns entries at the requested locale', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const findGlobal = vi.fn().mockResolvedValue({ entries: [ENTRY()] })
    vi.mocked(getPayloadClient).mockResolvedValue({ findGlobal } as never)

    const { GET } = await import('./route.js')
    const res = await GET(makeAuthedReq('GET', 'http://localhost/api/external/changelog?locale=en'))
    expect(res.status).toBe(200)
    expect(findGlobal.mock.calls[0][0]).toMatchObject({ slug: 'changelog', locale: 'en' })
    expect((await res.json()).data.entries).toHaveLength(1)
  })
})

describe('PATCH /api/external/changelog', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  function setup(existing: Array<Record<string, unknown>> = []) {
    const findGlobal = vi.fn().mockResolvedValue({ entries: existing })
    const updateGlobal = vi.fn().mockResolvedValue({ entries: existing })
    return { findGlobal, updateGlobal }
  }

  it('forwards entries + ?locale=en to updateGlobal', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const { findGlobal, updateGlobal } = setup()
    vi.mocked(getPayloadClient).mockResolvedValue({ findGlobal, updateGlobal } as never)

    const { PATCH } = await import('./route.js')
    const entries = [ENTRY({ id: 'e1', notes: [{ id: 'n1', text: 'Security', tag: 'security' }] })]
    const res = await PATCH(makeAuthedReq('PATCH', 'http://localhost/api/external/changelog?locale=en', { entries }))
    expect(res.status).toBe(200)
    expect(updateGlobal.mock.calls[0][0]).toMatchObject({ slug: 'changelog', locale: 'en' })
    expect(updateGlobal.mock.calls[0][0].data.entries[0].id).toBe('e1')
  })

  it('returns 400 when entries is not an array', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    vi.mocked(getPayloadClient).mockResolvedValue({} as never)
    const { PATCH } = await import('./route.js')
    const res = await PATCH(makeAuthedReq('PATCH', 'http://localhost/api/external/changelog', { entries: 'nope' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid ?locale', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const { findGlobal, updateGlobal } = setup()
    vi.mocked(getPayloadClient).mockResolvedValue({ findGlobal, updateGlobal } as never)
    const { PATCH } = await import('./route.js')
    const res = await PATCH(makeAuthedReq('PATCH', 'http://localhost/api/external/changelog?locale=de', { entries: [] }))
    expect(res.status).toBe(400)
    expect(updateGlobal).not.toHaveBeenCalled()
  })
})
