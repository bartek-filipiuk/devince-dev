/**
 * Tests for GET /api/apps/session-grant — the lookup that lets the success page
 * show a download link immediately instead of only pointing at the email.
 *
 * SECURITY POSTURE: this hands out a download token to whoever presents the
 * Stripe Checkout Session id. That id is unguessable (`cs_live_` + ~58 chars)
 * and lands only in the buyer's own browser, so it is the same risk class as the
 * download link we email. It is NOT a new authorization boundary — the token
 * itself remains HMAC-signed, expiring and use-capped. The route therefore:
 *  - never reveals anything about a session it has no grant for (plain ready:false),
 *  - refuses malformed ids before touching the DB,
 *  - is IP rate-limited so the id space cannot be probed in bulk.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const find = vi.fn()
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ find })) }))
vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))

function makeReq(qs: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(`http://localhost/api/apps/session-grant${qs}`, {
    method: 'GET',
    headers: { ...(headers ?? {}) },
  })
}

const SESSION = 'cs_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0'

describe('GET /api/apps/session-grant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    find.mockResolvedValue({ docs: [] })
  })

  it('400 gdy brak session_id', async () => {
    const { GET } = await import('./route')
    const res = await GET(makeReq(''))
    expect(res.status).toBe(400)
    expect(find).not.toHaveBeenCalled()
  })

  it('400 dla identyfikatora o niepoprawnym kształcie — bez dotykania bazy', async () => {
    const { GET } = await import('./route')
    for (const bad of ['abc', 'cs_' + 'x'.repeat(300), '../etc/passwd', 'cs test 1']) {
      const res = await GET(makeReq(`?session_id=${encodeURIComponent(bad)}`))
      expect(res.status).toBe(400)
    }
    expect(find).not.toHaveBeenCalled()
  })

  it('ready:false gdy webhook jeszcze nie utworzył grantu (wyścig po powrocie ze Stripe)', async () => {
    const { GET } = await import('./route')
    const res = await GET(makeReq(`?session_id=${SESSION}`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ready: false })
  })

  it('ready:true + token gdy grant istnieje', async () => {
    find.mockResolvedValue({ docs: [{ id: 1, token: 'tok.sig', stripeSessionId: SESSION }] })
    const { GET } = await import('./route')
    const res = await GET(makeReq(`?session_id=${SESSION}`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ready: true, token: 'tok.sig' })
    // Wyszukiwanie MUSI iść po stripeSessionId — nigdy po niczym, co poda klient wprost.
    expect(find.mock.calls[0][0].where).toEqual({ stripeSessionId: { equals: SESSION } })
  })

  it('nie wycieka pól grantu poza tokenem', async () => {
    find.mockResolvedValue({
      docs: [{ id: 1, token: 'tok.sig', email: 'kupujacy@example.com', amountPaid: 4900 }],
    })
    const { GET } = await import('./route')
    const body = await (await GET(makeReq(`?session_id=${SESSION}`))).json()
    expect(Object.keys(body).sort()).toEqual(['ready', 'token'])
  })

  it('rate-limit po IP — identyfikatorów sesji nie da się sondować hurtowo', async () => {
    const { GET } = await import('./route')
    const ip = { 'x-forwarded-for': '198.51.100.42' }
    let last = 200
    for (let i = 0; i < 40; i++) {
      last = (await GET(makeReq(`?session_id=cs_test_${'y'.repeat(20)}${i}`, ip))).status
    }
    expect(last).toBe(429)
  })
})
