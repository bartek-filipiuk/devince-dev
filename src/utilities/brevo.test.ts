import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendTransactionalEmail, sendDownloadLinkEmail } from './brevo'

beforeEach(() => {
  process.env.BREVO_API_KEY = 'k'
  vi.restoreAllMocks()
})

describe('sendTransactionalEmail', () => {
  it('posts to Brevo with api-key header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messageId: '1' }) })
    vi.stubGlobal('fetch', fetchMock)
    await sendTransactionalEmail({ to: 'a@b.c', subject: 'S', htmlContent: '<p>x</p>' })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('api.brevo.com/v3/smtp/email')
    expect((opts.headers as any)['api-key']).toBe('k')
    // Brevo requires a sender; without it the API returns 400 "sender is missing".
    const body = JSON.parse(opts.body as string)
    expect(body.sender?.email).toBeTruthy()
  })
  it('throws on non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'err' }))
    await expect(sendTransactionalEmail({ to: 'a@b.c', subject: 'S', htmlContent: 'x' })).rejects.toThrow()
  })
})

describe('sendDownloadLinkEmail', () => {
  afterEach(() => {
    delete process.env.BREVO_DOWNLOAD_TEMPLATE_ID
  })

  it('uses templateId + params when BREVO_DOWNLOAD_TEMPLATE_ID is set', async () => {
    process.env.BREVO_DOWNLOAD_TEMPLATE_ID = '42'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await sendDownloadLinkEmail({ to: 'buyer@example.com', link: 'https://files.example.com/abc', productTitle: 'My Product' })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [, opts] = fetchMock.mock.calls[0]
    const body = JSON.parse(opts.body as string)
    expect(body.templateId).toBe(42)
    expect(body.params).toEqual({ LINK: 'https://files.example.com/abc', PRODUCT: 'My Product' })
    expect(body.subject).toBeUndefined()
  })

  it('falls back to Polish subject+html when BREVO_DOWNLOAD_TEMPLATE_ID is not set', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await sendDownloadLinkEmail({ to: 'buyer@example.com', link: 'https://files.example.com/abc', productTitle: 'My Product' })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [, opts] = fetchMock.mock.calls[0]
    const body = JSON.parse(opts.body as string)
    expect(body.subject).toContain('My Product')
    expect(body.htmlContent).toContain('https://files.example.com/abc')
    expect(body.htmlContent).toContain('My Product')
    expect(body.templateId).toBeUndefined()
  })
})
