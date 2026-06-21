/**
 * Tests for the external header (nav) API. Harness mirrors products.test.ts:
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

const NAV = (label: string) => ({ id: `i${label}`, link: { type: 'custom', url: `https://x/${label}`, label } })

describe('GET /api/external/header', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('returns navItems at the requested locale', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const findGlobal = vi.fn().mockResolvedValue({ navItems: [NAV('Kursy')] })
    vi.mocked(getPayloadClient).mockResolvedValue({ findGlobal } as never)

    const { GET } = await import('./route.js')
    const res = await GET(makeAuthedReq('GET', 'http://localhost/api/external/header?locale=pl'))
    expect(res.status).toBe(200)
    expect(findGlobal.mock.calls[0][0]).toMatchObject({ slug: 'header', locale: 'pl' })
    expect((await res.json()).data.navItems).toHaveLength(1)
  })
})

describe('PATCH /api/external/header', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  function setup(existing: Array<Record<string, unknown>> = []) {
    const findGlobal = vi.fn().mockResolvedValue({ navItems: existing })
    const updateGlobal = vi.fn().mockResolvedValue({ navItems: existing })
    return { findGlobal, updateGlobal }
  }

  it('forwards navItems + ?locale=en to updateGlobal', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const { findGlobal, updateGlobal } = setup()
    vi.mocked(getPayloadClient).mockResolvedValue({ findGlobal, updateGlobal } as never)

    const { PATCH } = await import('./route.js')
    const items = [{ link: { type: 'custom', url: 'https://courses.devince.dev', label: 'Courses' } }]
    const res = await PATCH(makeAuthedReq('PATCH', 'http://localhost/api/external/header?locale=en', { navItems: items }))
    expect(res.status).toBe(200)
    expect(updateGlobal.mock.calls[0][0]).toMatchObject({ slug: 'header', locale: 'en' })
    expect(updateGlobal.mock.calls[0][0].data.navItems).toHaveLength(1)
  })

  it('carries existing item ids forward by position (preserves other-locale labels)', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const { findGlobal, updateGlobal } = setup([NAV('Kursy'), NAV('Apps')])
    vi.mocked(getPayloadClient).mockResolvedValue({ findGlobal, updateGlobal } as never)

    const { PATCH } = await import('./route.js')
    const items = [
      { link: { type: 'custom', url: 'https://courses.devince.dev', label: 'Courses' } },
      { link: { type: 'custom', url: 'https://apps.devince.dev', label: 'Apps' } },
    ]
    const res = await PATCH(makeAuthedReq('PATCH', 'http://localhost/api/external/header?locale=en', { navItems: items }))
    expect(res.status).toBe(200)
    const sent = updateGlobal.mock.calls[0][0].data.navItems
    expect(sent[0].id).toBe('iKursy')
    expect(sent[1].id).toBe('iApps')
  })

  it('returns 400 when navItems is not an array', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    vi.mocked(getPayloadClient).mockResolvedValue({} as never)
    const { PATCH } = await import('./route.js')
    const res = await PATCH(makeAuthedReq('PATCH', 'http://localhost/api/external/header', { navItems: 'nope' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid ?locale', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const { findGlobal, updateGlobal } = setup()
    vi.mocked(getPayloadClient).mockResolvedValue({ findGlobal, updateGlobal } as never)
    const { PATCH } = await import('./route.js')
    const res = await PATCH(makeAuthedReq('PATCH', 'http://localhost/api/external/header?locale=de', { navItems: [] }))
    expect(res.status).toBe(400)
    expect(updateGlobal).not.toHaveBeenCalled()
  })
})
