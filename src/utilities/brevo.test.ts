import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendTransactionalEmail } from './brevo'

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
  })
  it('throws on non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'err' }))
    await expect(sendTransactionalEmail({ to: 'a@b.c', subject: 'S', htmlContent: 'x' })).rejects.toThrow()
  })
})
