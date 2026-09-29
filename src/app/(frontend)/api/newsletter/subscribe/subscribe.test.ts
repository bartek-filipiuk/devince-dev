/**
 * Tests for POST /api/newsletter/subscribe — named sources, form path,
 * redirect allow-list, honeypot and rate limits. Brevo is mocked; we assert
 * what the route would have sent.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const brevoDoubleOptin = vi.fn(async (_args: Record<string, unknown>) => true)
vi.mock('@/utilities/brevoContacts', () => ({ brevoDoubleOptin }))

const ENV: Record<string, string> = {
  BREVO_API_KEY: 'test-key',
  BREVO_LIST_ID: '13',
  BREVO_DOI_TEMPLATE_ID: '1',
  BREVO_LESSON_LIST_ID: '14',
  BREVO_LESSON_DOI_TEMPLATE_ID: '9',
  NEXT_PUBLIC_SERVER_URL: 'https://devince.dev',
  NEWSLETTER_REDIRECT_ORIGINS: 'https://stronaw5dni.pl',
}
const saved: Record<string, string | undefined> = {}

function json(body: Record<string, unknown>, headers?: Record<string, string>) {
  return new NextRequest('http://localhost/api/newsletter/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(headers ?? {}) },
    body: JSON.stringify(body),
  })
}
function form(fields: Record<string, string>, headers?: Record<string, string>) {
  return new NextRequest('http://localhost/api/newsletter/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...(headers ?? {}) },
    body: new URLSearchParams(fields).toString(),
  })
}
async function post(req: NextRequest) {
  const { POST } = await import('./route')
  return POST(req)
}
function lastDoi() {
  return brevoDoubleOptin.mock.calls.at(-1)![0]
}

describe('POST /api/newsletter/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    for (const [k, v] of Object.entries(ENV)) {
      saved[k] = process.env[k]
      process.env[k] = v
    }
  })
  afterEach(() => {
    for (const k of Object.keys(ENV)) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  it('JSON without source subscribes to the newsletter list (existing callers)', async () => {
    const res = await post(json({ email: 'A@Example.com' }))
    expect(res.status).toBe(200)
    expect(lastDoi()).toMatchObject({
      email: 'a@example.com',
      listId: 13,
      templateId: '1',
      redirectionUrl: 'https://devince.dev/newsletter/confirmed',
    })
  })

  it('form POST with source=lekcja uses the lesson list, stores PROJEKT and 303s to next', async () => {
    const res = await post(
      form({
        email: 'kasia@example.com',
        source: 'lekcja',
        projekt: 'lokalnie',
        next: 'https://stronaw5dni.pl/lekcja/wyslane.html',
        confirmed: 'https://stronaw5dni.pl/lekcja/potwierdzone.html',
      }),
    )
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe('https://stronaw5dni.pl/lekcja/wyslane.html')
    expect(lastDoi()).toMatchObject({
      listId: 14,
      templateId: '9',
      redirectionUrl: 'https://stronaw5dni.pl/lekcja/potwierdzone.html',
      attributes: { PROJEKT: 'lokalnie' },
    })
  })

  it('rejects an unknown source and never names a list from the client', async () => {
    const res = await post(json({ email: 'x@example.com', source: 'admins', listId: 2 }))
    expect(res.status).toBe(400)
    expect(brevoDoubleOptin).not.toHaveBeenCalled()
  })

  it('ignores redirect targets outside the allow-list (no open redirect)', async () => {
    const res = await post(
      form({
        email: 'y@example.com',
        source: 'lekcja',
        next: 'https://evil.example/phish',
        confirmed: 'https://evil.example/phish2',
      }),
    )
    expect(res.status).toBe(200)
    expect(lastDoi()).toMatchObject({ redirectionUrl: 'https://devince.dev/newsletter/confirmed' })
  })

  it('drops an unexpected PROJEKT value instead of storing it', async () => {
    await post(json({ email: 'z@example.com', source: 'lekcja', projekt: '<script>' }))
    expect(lastDoi().attributes).toEqual({})
  })

  it('honeypot filled → success-shaped reply, nothing sent', async () => {
    const res = await post(form({ email: 'bot@example.com', website: 'http://spam' }))
    expect(res.status).toBe(200)
    expect(brevoDoubleOptin).not.toHaveBeenCalled()
  })

  it('rejects malformed and oversized emails', async () => {
    expect((await post(json({ email: 'not-an-email' }))).status).toBe(400)
    expect((await post(json({ email: 'a'.repeat(250) + '@x.pl' }))).status).toBe(400)
    expect(brevoDoubleOptin).not.toHaveBeenCalled()
  })

  it('caps repeated signups of one email at 3 per day', async () => {
    for (let i = 0; i < 3; i++) {
      expect((await post(json({ email: 'r@example.com' }))).status).toBe(200)
    }
    expect((await post(json({ email: 'r@example.com' }))).status).toBe(429)
    expect(brevoDoubleOptin).toHaveBeenCalledTimes(3)
  })

  it('503 when the chosen source is not configured', async () => {
    delete process.env.BREVO_LESSON_LIST_ID
    const res = await post(json({ email: 'q@example.com', source: 'lekcja' }))
    expect(res.status).toBe(503)
  })
})
