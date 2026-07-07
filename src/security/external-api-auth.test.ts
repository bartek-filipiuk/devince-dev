/**
 * D5 — external content API: Bearer auth (`api/external/_lib/auth.ts`).
 *
 * Attack cases:
 *   (a) no Authorization header → 401 AUTH_MISSING
 *   (b) wrong token → 401 AUTH_INVALID, compared via crypto.timingSafeEqual
 *       (spy) — NOT a short-circuiting `===`
 *   (c) correct token → passes (null)
 *   (d) EXTERNAL_API_TOKEN unset → 503 (fail closed, not open)
 *   (e) route level: POST /api/external/programs without auth → 401 and the
 *       DB layer is NEVER touched
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { validateAuth } from '../app/(frontend)/api/external/_lib/auth'

// ── payload mock (hoisted) — for the route-level case ───────────────────────

const getPayload = vi.fn(async () => ({ find: vi.fn(), create: vi.fn() }))
vi.mock('payload', () => ({ getPayload }))
vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))

// ── helpers ─────────────────────────────────────────────────────────────────

const TOKEN = 'ext-secret-token'

function makeReq(auth?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (auth !== undefined) headers['authorization'] = auth
  return new NextRequest('http://localhost/api/external/programs', { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.EXTERNAL_API_TOKEN = TOKEN
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('external API auth — validateAuth', () => {
  it('(a) missing Authorization header → 401 AUTH_MISSING', async () => {
    const res = validateAuth(makeReq(undefined))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
    expect((await res!.json()).error.code).toBe('AUTH_MISSING')
  })

  it('(a2) non-Bearer scheme → 401 (Basic creds are not accepted)', async () => {
    const res = validateAuth(makeReq(`Basic ${TOKEN}`))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })

  it('(b) wrong token → 401 AUTH_INVALID, and the comparison is timing-safe', async () => {
    const tse = vi.spyOn(crypto, 'timingSafeEqual')

    const res = validateAuth(makeReq('Bearer wrong-token'))

    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
    expect((await res!.json()).error.code).toBe('AUTH_INVALID')
    // The verdict came out of crypto.timingSafeEqual, not `===`.
    expect(tse).toHaveBeenCalledOnce()
    expect(tse).toHaveReturnedWith(false)
  })

  it('(b2) near-miss token (right prefix) is still rejected via timingSafeEqual', () => {
    const tse = vi.spyOn(crypto, 'timingSafeEqual')
    const res = validateAuth(makeReq(`Bearer ${TOKEN}x`))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
    expect(tse).toHaveBeenCalledOnce()
  })

  it('(c) correct token → passes (null), verified through timingSafeEqual', () => {
    const tse = vi.spyOn(crypto, 'timingSafeEqual')
    const res = validateAuth(makeReq(`Bearer ${TOKEN}`))
    expect(res).toBeNull()
    expect(tse).toHaveBeenCalledOnce()
    expect(tse).toHaveReturnedWith(true)
  })

  it('(d) EXTERNAL_API_TOKEN unset → 503, fails CLOSED even with a Bearer header', async () => {
    delete process.env.EXTERNAL_API_TOKEN
    const res = validateAuth(makeReq('Bearer anything'))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(503)
    expect((await res!.json()).error.code).toBe('SERVICE_UNAVAILABLE')
  })
})

describe('external API auth — route enforces it', () => {
  it('(e) POST /api/external/programs without auth → 401, DB never touched', async () => {
    const { POST } = await import('../app/(frontend)/api/external/programs/route')

    const req = new NextRequest('http://localhost/api/external/programs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Injected course', type: 'course' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(401)
    expect(getPayload).not.toHaveBeenCalled() // rejected before any Payload access
  })
})
