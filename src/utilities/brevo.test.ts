import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendTransactionalEmail, sendDownloadLinkEmail, sendCourseAccessEmail } from './brevo'

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

  it('uses templateId + params (with CONSENT/LOCALE) when BREVO_DOWNLOAD_TEMPLATE_ID is set', async () => {
    process.env.BREVO_DOWNLOAD_TEMPLATE_ID = '42'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await sendDownloadLinkEmail({ to: 'buyer@example.com', link: 'https://files.example.com/abc', productTitle: 'My Product' })
    expect(fetchMock).toHaveBeenCalledOnce()
    const [, opts] = fetchMock.mock.calls[0]
    const body = JSON.parse(opts.body as string)
    expect(body.templateId).toBe(42)
    // No consent timestamp passed → CONSENT is empty, locale defaults to pl.
    expect(body.params).toEqual({ LINK: 'https://files.example.com/abc', PRODUCT: 'My Product', CONSENT: '', LOCALE: 'pl' })
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

  it('emits the Polish durable-medium consent block when withdrawalConsentAt is given', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await sendDownloadLinkEmail({
      to: 'buyer@example.com',
      link: 'https://files.example.com/abc',
      productTitle: 'My Product',
      withdrawalConsentAt: '2026-06-18T10:00:00.000Z',
    })
    const [, opts] = fetchMock.mock.calls[0]
    const body = JSON.parse(opts.body as string)
    // Confirmation of consent on a durable medium (Art. 38 pkt 13).
    expect(body.htmlContent).toContain('art. 38 pkt 13')
    expect(body.htmlContent).toContain('trwałym nośniku')
  })

  it('localizes subject + consent block to English when locale=en', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await sendDownloadLinkEmail({
      to: 'buyer@example.com',
      link: 'https://files.example.com/abc',
      productTitle: 'My Product',
      locale: 'en',
      withdrawalConsentAt: '2026-06-18T10:00:00.000Z',
    })
    const [, opts] = fetchMock.mock.calls[0]
    const body = JSON.parse(opts.body as string)
    expect(body.subject).toContain('download link')
    expect(body.htmlContent).toContain('Art. 38(13)')
    expect(body.htmlContent).toContain('durable medium')
  })
})

describe('sendCourseAccessEmail', () => {
  afterEach(() => {
    delete process.env.BREVO_COURSE_ACCESS_TEMPLATE_ID
  })

  it('includes next + consent confirmation in the course access email', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messageId: '1' }) })
    vi.stubGlobal('fetch', fetchMock)
    await sendCourseAccessEmail({
      to: 'a@b.c',
      token: 'tok',
      isNew: true,
      programId: '16',
      next: '/kurs',
      withdrawalConsentAt: '2026-06-18T10:00:00Z',
    })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    const html = body.htmlContent as string
    expect(html).toContain('set-password?token=tok')
    expect(html).toMatch(/next=\/?(%2F)?kurs/)
    expect(html.toLowerCase()).toContain('odstąp') // durable-medium confirmation present
  })

  it('omits next + consent block when those args are absent (back-compat)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messageId: '1' }) })
    vi.stubGlobal('fetch', fetchMock)
    await sendCourseAccessEmail({ to: 'a@b.c', token: 'tok', isNew: false, programId: '16' })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    const html = body.htmlContent as string
    expect(html).toContain('set-password?token=tok')
    expect(html).not.toContain('next=')
    expect(html).not.toContain('art. 38 pkt 13')
  })

  it('passes next + consent as template params when BREVO_COURSE_ACCESS_TEMPLATE_ID is set', async () => {
    process.env.BREVO_COURSE_ACCESS_TEMPLATE_ID = '99'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await sendCourseAccessEmail({
      to: 'a@b.c',
      token: 'tok',
      isNew: true,
      programId: '16',
      next: '/kurs',
      withdrawalConsentAt: '2026-06-18T10:00:00Z',
    })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.templateId).toBe(99)
    expect(body.params.activationLink).toContain('next=/kurs')
    expect(String(body.params.CONSENT).toLowerCase()).toContain('odstąp')
  })
})
