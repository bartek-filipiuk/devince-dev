import { describe, it, expect, vi, beforeEach } from 'vitest'
import { revokeNdqsByEmail } from './ndqsRevoke'

beforeEach(() => {
  delete process.env.NDQS_REVOKE_URL
  process.env.NDQS_ENROLL_URL = 'https://learn.devince.dev/api/admin/enroll-by-email'
  process.env.NDQS_SERVICE_TOKEN = 'svc'
})

it('POSTs email+course_id with the service token header to the revoke URL', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
  vi.stubGlobal('fetch', fetchMock)
  const r = await revokeNdqsByEmail({ email: 'b@x.pl', courseId: 'uuid-1' })
  expect(r).toEqual({ ok: true, status: 200 })
  const [url, opts] = fetchMock.mock.calls[0]
  expect(url).toBe('https://learn.devince.dev/api/admin/revoke-enrollment')
  expect((opts.headers as any)['X-Service-Token']).toBe('svc')
  expect(JSON.parse(opts.body as string)).toEqual({ email: 'b@x.pl', course_id: 'uuid-1' })
})

it('prefers NDQS_REVOKE_URL when set', async () => {
  process.env.NDQS_REVOKE_URL = 'https://learn.devince.dev/api/admin/revoke-enrollment-custom'
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
  vi.stubGlobal('fetch', fetchMock)
  await revokeNdqsByEmail({ email: 'b@x.pl', courseId: 'uuid-1' })
  const [url] = fetchMock.mock.calls[0]
  expect(url).toBe('https://learn.devince.dev/api/admin/revoke-enrollment-custom')
})

it('never throws on network error — returns ok:false', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
  const r = await revokeNdqsByEmail({ email: 'b@x.pl', courseId: 'u' })
  expect(r.ok).toBe(false)
})

it('returns {ok:false, status:0} without fetching when no URL env is set', async () => {
  delete process.env.NDQS_ENROLL_URL
  delete process.env.NDQS_REVOKE_URL
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  const r = await revokeNdqsByEmail({ email: 'b@x.pl', courseId: 'u' })
  expect(r).toEqual({ ok: false, status: 0 })
  expect(fetchMock).not.toHaveBeenCalled()
})
