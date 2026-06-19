import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { notifyEvent } from './notify'

// notifyEvent is the money-critical, best-effort server event pipe: it ALWAYS
// writes a structured log line, optionally POSTs to Discord when
// DISCORD_WEBHOOK_URL is set, and MUST NEVER throw — a failing log or POST is a
// no-op that cannot break the Stripe webhook that calls it.

const ORIGINAL_DISCORD = process.env.DISCORD_WEBHOOK_URL

beforeEach(() => {
  delete process.env.DISCORD_WEBHOOK_URL
  vi.restoreAllMocks()
})

afterEach(() => {
  if (ORIGINAL_DISCORD === undefined) delete process.env.DISCORD_WEBHOOK_URL
  else process.env.DISCORD_WEBHOOK_URL = ORIGINAL_DISCORD
  vi.restoreAllMocks()
})

describe('notifyEvent', () => {
  it('always writes a structured JSON log line containing the event kind + payload', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await notifyEvent('purchase', { surface: 'courses', amount: 4700, email: 'jan@example.com' })
    expect(logSpy).toHaveBeenCalledTimes(1)
    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string)
    expect(parsed).toMatchObject({
      event: 'purchase',
      surface: 'courses',
      amount: 4700,
      email: 'jan@example.com',
    })
  })

  it('does NOT POST to Discord when DISCORD_WEBHOOK_URL is unset', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await notifyEvent('checkout_start', { surface: 'apps', amount: 1900, currency: 'pln' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('POSTs a JSON message to the Discord webhook URL when set', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.test/webhook/abc'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await notifyEvent('purchase', {
      surface: 'courses',
      item: 'Kurs „Bezpieczne flow"',
      amount: 4700,
      currency: 'pln',
      email: 'jan@example.com',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://discord.test/webhook/abc')
    expect(opts.method).toBe('POST')
    expect((opts.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    const body = JSON.parse(opts.body as string)
    // Discord expects a `content` field; it carries the localized line + email.
    expect(typeof body.content).toBe('string')
    expect(body.content).toContain('jan@example.com')
  })

  it('never throws even when fetch rejects (best-effort)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.test/webhook/abc'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('discord down')))
    await expect(
      notifyEvent('purchase', { surface: 'courses', email: 'jan@example.com' }),
    ).resolves.toBeUndefined()
  })

  it('never throws even when console.log itself throws (best-effort log)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {
      throw new Error('log sink broken')
    })
    await expect(
      notifyEvent('refund', { item: 'idea-to-mvp', email: 'jan@example.com' }),
    ).resolves.toBeUndefined()
  })

  it('formats a recognizable line per event kind (purchase/refund/email_failed/checkout)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.test/webhook/abc'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await notifyEvent('refund', { item: 'idea-to-mvp', email: 'jan@example.com' })
    await notifyEvent('email_failed', { kind: 'set-password', email: 'jan@example.com' })
    await notifyEvent('checkout_start', { item: 'Kurs', amount: 4700, currency: 'pln' })

    const lines = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body as string).content as string)
    expect(lines[0]).toContain('Zwrot')
    expect(lines[0]).toContain('idea-to-mvp')
    expect(lines[1]).toContain('Mail nie dostarczony')
    expect(lines[1]).toContain('set-password')
    expect(lines[2]).toContain('Checkout')
  })
})
