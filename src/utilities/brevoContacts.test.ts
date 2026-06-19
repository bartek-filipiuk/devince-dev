import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { addBrevoContact, brevoDoubleOptin } from './brevoContacts'

// brevoContacts holds the two Brevo CONTACT-LIST calls (distinct from the
// transactional `brevo.ts` /smtp/email helper):
//   - addBrevoContact      → POST /v3/contacts            (upsert into a list)
//   - brevoDoubleOptin     → POST /v3/contacts/doubleOptinConfirmation
// Both are BEST-EFFORT: they may be called from the Stripe webhook / checkout
// path, so they must NEVER throw — a Brevo outage or a misconfig is a no-op,
// never a 500 that breaks a money-critical grant. DOI additionally NO-OPS when
// no templateId is configured (ships dark).
//
// brevoDoubleOptin returns a boolean:
//   true  — Brevo accepted the DOI request (ok response)
//   false — no-op (missing config) OR Brevo returned non-ok OR fetch threw
// addBrevoContact remains void (callers never need the result).

const ORIGINAL_KEY = process.env.BREVO_API_KEY

beforeEach(() => {
  process.env.BREVO_API_KEY = 'test-key'
  vi.restoreAllMocks()
})

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.BREVO_API_KEY
  else process.env.BREVO_API_KEY = ORIGINAL_KEY
  vi.restoreAllMocks()
})

describe('addBrevoContact', () => {
  it('POSTs to /v3/contacts with api-key header and an upsert body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await addBrevoContact('jan@example.com', 12, { SOURCE: 'purchase' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.brevo.com/v3/contacts')
    expect(opts.method).toBe('POST')
    const headers = opts.headers as Record<string, string>
    expect(headers['api-key']).toBe('test-key')
    expect(headers['content-type']).toBe('application/json')
    const body = JSON.parse(opts.body as string)
    expect(body).toMatchObject({
      email: 'jan@example.com',
      listIds: [12],
      attributes: { SOURCE: 'purchase' },
      updateEnabled: true,
    })
  })

  it('omits attributes from the body when none are passed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await addBrevoContact('jan@example.com', 12)

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.attributes).toBeUndefined()
  })

  it('no-ops (no fetch) when BREVO_API_KEY is unset', async () => {
    delete process.env.BREVO_API_KEY
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await addBrevoContact('jan@example.com', 12)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('never throws when fetch rejects (best-effort)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('brevo down')))
    await expect(addBrevoContact('jan@example.com', 12)).resolves.toBeUndefined()
  })

  it('never throws when Brevo returns a non-ok response (e.g. duplicate)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ code: 'duplicate_parameter' }),
        text: async () => '{"code":"duplicate_parameter"}',
      }),
    )
    await expect(addBrevoContact('jan@example.com', 12)).resolves.toBeUndefined()
  })
})

describe('brevoDoubleOptin', () => {
  it('POSTs to /v3/contacts/doubleOptinConfirmation with the DOI body shape and returns true on ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    const result = await brevoDoubleOptin({
      email: 'jan@example.com',
      listId: 12,
      templateId: 1,
      redirectionUrl: 'https://courses.devince.dev/',
      attributes: { SOURCE: 'purchase', PRODUCT: 'flow', SURFACE: 'courses' },
    })

    expect(result).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.brevo.com/v3/contacts/doubleOptinConfirmation')
    expect(opts.method).toBe('POST')
    const headers = opts.headers as Record<string, string>
    expect(headers['api-key']).toBe('test-key')
    expect(headers['content-type']).toBe('application/json')
    const body = JSON.parse(opts.body as string)
    expect(body).toMatchObject({
      email: 'jan@example.com',
      includeListIds: [12],
      templateId: 1,
      redirectionUrl: 'https://courses.devince.dev/',
      attributes: { SOURCE: 'purchase', PRODUCT: 'flow', SURFACE: 'courses' },
      updateEnabled: true,
    })
  })

  it('accepts a string templateId / listId and coerces them to numbers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await brevoDoubleOptin({
      email: 'jan@example.com',
      listId: '12' as unknown as number,
      templateId: '1' as unknown as number,
      redirectionUrl: 'https://courses.devince.dev/',
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.includeListIds).toEqual([12])
    expect(body.templateId).toBe(1)
  })

  it('NO-OPS (no fetch) when templateId is falsy — ships dark — returns false', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const result = await brevoDoubleOptin({
      email: 'jan@example.com',
      listId: 12,
      templateId: undefined,
      redirectionUrl: 'https://courses.devince.dev/',
    })

    expect(result).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('NO-OPS when templateId is an unparseable / zero value — returns false', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const result = await brevoDoubleOptin({
      email: 'jan@example.com',
      listId: 12,
      templateId: 'abc' as unknown as number,
      redirectionUrl: 'https://courses.devince.dev/',
    })

    expect(result).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('no-ops (no fetch) when BREVO_API_KEY is unset even with a templateId — returns false', async () => {
    delete process.env.BREVO_API_KEY
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await brevoDoubleOptin({
      email: 'jan@example.com',
      listId: 12,
      templateId: 1,
      redirectionUrl: 'https://courses.devince.dev/',
    })

    expect(result).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('never throws when fetch rejects (best-effort) — returns false', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('brevo down')))
    const result = await brevoDoubleOptin({
      email: 'jan@example.com',
      listId: 12,
      templateId: 1,
      redirectionUrl: 'https://courses.devince.dev/',
    })
    expect(result).toBe(false)
  })

  it('never throws when Brevo returns a non-ok response — returns false', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ code: 'duplicate_parameter' }),
        text: async () => '{"code":"duplicate_parameter"}',
      }),
    )
    const result = await brevoDoubleOptin({
      email: 'jan@example.com',
      listId: 12,
      templateId: 1,
      redirectionUrl: 'https://courses.devince.dev/',
    })
    expect(result).toBe(false)
  })

  it('masks email in brevo_doi_skipped log (no plain PII in logs)', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await brevoDoubleOptin({
      email: 'jankowalski@example.com',
      listId: 12,
      templateId: undefined,
      redirectionUrl: 'https://courses.devince.dev/',
    })

    expect(logSpy).toHaveBeenCalledTimes(1)
    const logged = logSpy.mock.calls[0][0] as string
    // Raw email must not appear
    expect(logged).not.toContain('jankowalski@example.com')
    // Masked form should appear (first char + ellipsis + domain)
    expect(logged).toContain('j…@example.com')
  })
})
