/**
 * Tests for PATCH /api/external/lessons/[idOrSlug] and
 * DELETE /api/external/lessons/[idOrSlug].
 *
 * Harness notes (mirrors programs.test.ts):
 * - `getPayloadClient` is mocked so that payload ops (update/delete/findByID/find)
 *   are vitest spies.
 * - `process.env.EXTERNAL_API_TOKEN` is set to TOKEN so validateAuth passes.
 * - params is supplied as `Promise.resolve({ idOrSlug })` matching Next.js 15
 *   async params signature.
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

function makeAuthedReq(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost/api/external/lessons/13', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body),
  })
}

function makeUnauthedReq(): NextRequest {
  return new NextRequest('http://localhost/api/external/lessons/13', {
    method: 'DELETE',
  })
}

// ── PATCH /api/external/lessons/[idOrSlug] ─────────────────────────────────

describe('PATCH /api/external/lessons/[idOrSlug]', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('PATCH updates a lesson by id', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const update = vi.fn().mockResolvedValue({ id: 13, title: 'New', slug: 'new', nr: null, phaseId: null, _status: 'published' })
    const findByID = vi.fn().mockResolvedValue({ id: 13 })
    vi.mocked(getPayloadClient).mockResolvedValue({ update, findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const res = await PATCH(makeAuthedReq({ title: 'New' }), { params: Promise.resolve({ idOrSlug: '13' }) })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ collection: 'lessons', id: 13, overrideAccess: true }))
    expect(res.status).toBe(200)
  })

  it('PATCH returns 401 without token', async () => {
    const { PATCH } = await import('./[idOrSlug]/route.js')

    const unauthed = new NextRequest('http://localhost/api/external/lessons/13', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'New' }),
    })

    const res = await PATCH(unauthed, { params: Promise.resolve({ idOrSlug: '13' }) })
    expect(res.status).toBe(401)
  })

  it('PATCH returns 404 when lesson not found', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const findByID = vi.fn().mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }))
    vi.mocked(getPayloadClient).mockResolvedValue({ findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const res = await PATCH(makeAuthedReq({ title: 'X' }), { params: Promise.resolve({ idOrSlug: '99' }) })
    expect(res.status).toBe(404)
  })

  it('PATCH updates a lesson by slug', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const update = vi.fn().mockResolvedValue({ id: 5, title: 'Updated', slug: 'my-lesson', nr: null, phaseId: null, _status: 'published' })
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 5 }] })
    vi.mocked(getPayloadClient).mockResolvedValue({ update, find } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const req = new NextRequest('http://localhost/api/external/lessons/my-lesson', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ title: 'Updated' }),
    })

    const res = await PATCH(req, { params: Promise.resolve({ idOrSlug: 'my-lesson' }) })
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ collection: 'lessons', id: 5, overrideAccess: true }))
    expect(res.status).toBe(200)
  })

  it('PATCH passes only provided fields to update', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const update = vi.fn().mockResolvedValue({ id: 13, title: 'Old', slug: 's', nr: 2, phaseId: 'ph', _status: 'published' })
    const findByID = vi.fn().mockResolvedValue({ id: 13 })
    vi.mocked(getPayloadClient).mockResolvedValue({ update, findByID } as never)

    const { PATCH } = await import('./[idOrSlug]/route.js')

    const res = await PATCH(makeAuthedReq({ nr: 5 }), { params: Promise.resolve({ idOrSlug: '13' }) })
    expect(res.status).toBe(200)
    const data = update.mock.calls[0][0].data
    expect(data.nr).toBe(5)
    expect(data).not.toHaveProperty('title')
  })
})

// ── DELETE /api/external/lessons/[idOrSlug] ────────────────────────────────

describe('DELETE /api/external/lessons/[idOrSlug]', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('DELETE removes a lesson; 401 without token', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const del = vi.fn().mockResolvedValue({ id: 13 })
    const findByID = vi.fn().mockResolvedValue({ id: 13 })
    vi.mocked(getPayloadClient).mockResolvedValue({ delete: del, findByID } as never)

    const { DELETE } = await import('./[idOrSlug]/route.js')

    const ok = await DELETE(makeAuthedReq(), { params: Promise.resolve({ idOrSlug: '13' }) })
    expect(del).toHaveBeenCalledWith(expect.objectContaining({ collection: 'lessons', id: 13, overrideAccess: true }))
    expect(ok.status).toBe(200)

    const no = await DELETE(makeUnauthedReq(), { params: Promise.resolve({ idOrSlug: '13' }) })
    expect(no.status).toBe(401)
  })

  it('DELETE returns { deleted: true, id } on success', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const del = vi.fn().mockResolvedValue({ id: 13 })
    const findByID = vi.fn().mockResolvedValue({ id: 13 })
    vi.mocked(getPayloadClient).mockResolvedValue({ delete: del, findByID } as never)

    const { DELETE } = await import('./[idOrSlug]/route.js')

    const res = await DELETE(makeAuthedReq(), { params: Promise.resolve({ idOrSlug: '13' }) })
    const body = await res.json()
    expect(body).toEqual({ deleted: true, id: 13 })
  })

  it('DELETE returns 404 when lesson not found', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const findByID = vi.fn().mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }))
    vi.mocked(getPayloadClient).mockResolvedValue({ findByID } as never)

    const { DELETE } = await import('./[idOrSlug]/route.js')

    const res = await DELETE(makeAuthedReq(), { params: Promise.resolve({ idOrSlug: '99' }) })
    expect(res.status).toBe(404)
  })
})
