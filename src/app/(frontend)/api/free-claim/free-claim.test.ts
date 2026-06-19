/**
 * Tests for POST /api/free-claim — the lead-magnet email-capture endpoint.
 *
 * This route grants NO access itself; it validates the item is a published
 * lead-magnet SERVER-SIDE, signs a claim token, and fires Brevo's double opt-in
 * carrying that token in the redirectionUrl. The grant happens later at
 * /claim/confirmed when the email owner clicks Brevo's link.
 *
 * Harness: mock `payload` (getPayload → { find }), mock brevoContacts so we can
 * assert the DOI call + inspect the signed token. NextRequest needs a full URL.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const find = vi.fn()
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ find })) }))
vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))

const brevoDoubleOptin = vi.fn(async () => {})
vi.mock('@/utilities/brevoContacts', () => ({ brevoDoubleOptin }))

import { verifyClaim } from '@/utilities/claimToken'

function makeReq(body: Record<string, unknown>, headers?: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost/api/free-claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(headers ?? {}) },
    body: JSON.stringify(body),
  })
}

function mockItem(item: Record<string, unknown> | null) {
  find.mockResolvedValue({ docs: item ? [item] : [] })
}

const LEAD_PRODUCT = { id: 7, title: 'Free Template', slug: 'free-template', accessMode: 'lead-magnet' }
const PAID_PRODUCT = { id: 8, title: 'Paid Template', slug: 'paid-template', accessMode: 'paid' }
const LEAD_PROGRAM = { id: 16, title: 'Free Course', slug: 'free-course', accessMode: 'lead-magnet' }

describe('POST /api/free-claim', () => {
  let savedSecret: string | undefined
  let savedTpl: string | undefined
  let savedList: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    savedSecret = process.env.CLAIM_TOKEN_SECRET
    savedTpl = process.env.BREVO_DOI_TEMPLATE_ID
    savedList = process.env.BREVO_LIST_ID
    process.env.CLAIM_TOKEN_SECRET = 'claim-secret-test'
    process.env.BREVO_DOI_TEMPLATE_ID = '1'
    process.env.BREVO_LIST_ID = '12'
  })
  afterEach(() => {
    restore('CLAIM_TOKEN_SECRET', savedSecret)
    restore('BREVO_DOI_TEMPLATE_ID', savedTpl)
    restore('BREVO_LIST_ID', savedList)
  })

  it('returns 503 when the DOI template is not configured', async () => {
    delete process.env.BREVO_DOI_TEMPLATE_ID
    const { POST } = await import('./route')
    mockItem(LEAD_PRODUCT)
    const res = await POST(makeReq({ surface: 'apps', slug: 'free-template', email: 'a@b.pl' }))
    expect(res.status).toBe(503)
    expect(brevoDoubleOptin).not.toHaveBeenCalled()
  })

  it('rejects an invalid email (400) without hitting the DB', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq({ surface: 'apps', slug: 'free-template', email: 'not-an-email' }))
    expect(res.status).toBe(400)
    expect(find).not.toHaveBeenCalled()
    expect(brevoDoubleOptin).not.toHaveBeenCalled()
  })

  it('rejects an invalid surface (400)', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeReq({ surface: 'ndqs', slug: 'x', email: 'a@b.pl' }))
    expect(res.status).toBe(400)
    expect(brevoDoubleOptin).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown / unpublished item', async () => {
    const { POST } = await import('./route')
    mockItem(null)
    const res = await POST(makeReq({ surface: 'apps', slug: 'nope', email: 'a@b.pl' }))
    expect(res.status).toBe(404)
    expect(brevoDoubleOptin).not.toHaveBeenCalled()
  })

  it('returns 400 for a PAID item (cannot make a paid item free)', async () => {
    const { POST } = await import('./route')
    mockItem(PAID_PRODUCT)
    const res = await POST(makeReq({ surface: 'apps', slug: 'paid-template', email: 'a@b.pl' }))
    expect(res.status).toBe(400)
    expect(brevoDoubleOptin).not.toHaveBeenCalled()
  })

  it('valid apps lead-magnet → 200 + DOI fired with a signed app token + leadmagnet attrs', async () => {
    const { POST } = await import('./route')
    mockItem(LEAD_PRODUCT)
    const res = await POST(makeReq({ surface: 'apps', slug: 'free-template', email: 'a@b.pl' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    expect(brevoDoubleOptin).toHaveBeenCalledOnce()
    const arg = brevoDoubleOptin.mock.calls[0][0] as {
      email: string
      listId: number
      templateId: unknown
      redirectionUrl: string
      attributes: Record<string, unknown>
    }
    expect(arg.email).toBe('a@b.pl')
    expect(arg.listId).toBe(12)
    expect(arg.attributes).toEqual({ SOURCE: 'leadmagnet', PRODUCT: 'free-template', SURFACE: 'apps' })

    // The redirectionUrl carries the signed claim token at /claim/confirmed.
    const url = new URL(arg.redirectionUrl)
    expect(url.pathname).toBe('/claim/confirmed')
    const grant = url.searchParams.get('grant')
    expect(grant).toBeTruthy()
    // The token must verify and bind kind=app + the REAL item id (from the DB,
    // not the client) + the submitted email.
    expect(verifyClaim(grant as string)).toEqual({ kind: 'app', itemId: '7', email: 'a@b.pl' })
  })

  it('valid courses lead-magnet → DOI fired with a signed course token', async () => {
    const { POST } = await import('./route')
    mockItem(LEAD_PROGRAM)
    const res = await POST(makeReq({ surface: 'courses', slug: 'free-course', email: 'c@d.pl' }))
    expect(res.status).toBe(200)
    const arg = brevoDoubleOptin.mock.calls[0][0] as { redirectionUrl: string; attributes: Record<string, unknown> }
    expect(arg.attributes).toEqual({ SOURCE: 'leadmagnet', PRODUCT: 'free-course', SURFACE: 'courses' })
    const grant = new URL(arg.redirectionUrl).searchParams.get('grant')
    expect(verifyClaim(grant as string)).toEqual({ kind: 'course', itemId: '16', email: 'c@d.pl' })
  })

  it('rate-limits repeated hits from the same IP+email (429)', async () => {
    const { POST } = await import('./route')
    mockItem(LEAD_PRODUCT)
    const ip = { 'x-forwarded-for': '203.0.113.9' }
    const body = { surface: 'apps', slug: 'free-template', email: 'spam@victim.com' }
    // The route caps at 3/min/(IP+email). The 4th must be 429.
    expect((await POST(makeReq(body, ip))).status).toBe(200)
    expect((await POST(makeReq(body, ip))).status).toBe(200)
    expect((await POST(makeReq(body, ip))).status).toBe(200)
    const blocked = await POST(makeReq(body, ip))
    expect(blocked.status).toBe(429)
    // DOI must only have fired for the 3 allowed hits, never the blocked one.
    expect(brevoDoubleOptin).toHaveBeenCalledTimes(3)
  })

  it('is neutral: same 200 shape whether or not the item exists is NOT leaked — unknown still 404', async () => {
    // Sanity: we DO distinguish unknown (404) from paid (400) for the caller's
    // own UX, but we never reveal whether the EMAIL is already a contact. The
    // success body is a constant {ok:true} regardless of email.
    const { POST } = await import('./route')
    mockItem(LEAD_PRODUCT)
    const r1 = await POST(makeReq({ surface: 'apps', slug: 'free-template', email: 'new@x.pl' }))
    expect(await r1.json()).toEqual({ ok: true })
  })
})

function restore(k: string, v: string | undefined) {
  if (v === undefined) delete process.env[k]
  else process.env[k] = v
}
