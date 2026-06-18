import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enrollNdqsByEmail } from './ndqsEnroll'

beforeEach(() => {
  process.env.NDQS_ENROLL_URL = 'https://learn.devince.dev/api/admin/enroll-by-email'
  process.env.NDQS_SERVICE_TOKEN = 'svc'
})

it('POSTs email+course_id with the service token header', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 })
  vi.stubGlobal('fetch', fetchMock)
  const r = await enrollNdqsByEmail({ email: 'b@x.pl', courseId: 'uuid-1' })
  expect(r).toEqual({ ok: true, status: 201 })
  const [url, opts] = fetchMock.mock.calls[0]
  expect(url).toBe(process.env.NDQS_ENROLL_URL)
  expect((opts.headers as any)['X-Service-Token']).toBe('svc')
  expect(JSON.parse(opts.body as string)).toEqual({ email: 'b@x.pl', course_id: 'uuid-1' })
})

it('never throws on network error — returns ok:false', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
  const r = await enrollNdqsByEmail({ email: 'b@x.pl', courseId: 'u' })
  expect(r.ok).toBe(false)
})
