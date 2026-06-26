import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { buildManifest } from './manifest'

describe('buildManifest', () => {
  it('describes auth, conventions, and a resources array', () => {
    const m = buildManifest()
    expect(m.auth.type).toBe('bearer')
    expect(typeof m.conventions.locale).toBe('string')
    expect(typeof m.conventions.envelope).toBe('string')
    expect(Array.isArray(m.resources)).toBe(true)
  })

  it('covers every writable collection resource (drift guard)', () => {
    const names = buildManifest().resources.map((r) => r.name)
    for (const r of ['programs', 'lessons', 'products', 'posts', 'projects', 'media', 'app-assets']) {
      expect(names, `manifest missing resource "${r}"`).toContain(r)
    }
  })

  it('each resource lists methods and the whole thing is JSON-serializable', () => {
    const m = buildManifest()
    for (const r of m.resources) {
      expect(r.name, 'resource needs a name').toBeTruthy()
      expect(r.methods, `resource "${r.name}" needs methods`).toBeTruthy()
    }
    expect(() => JSON.stringify(m)).not.toThrow()
  })

  it('exposes program enums (type / pricing / accessMode)', () => {
    const programs = buildManifest().resources.find((r) => r.name === 'programs')
    expect(programs?.enums?.type).toContain('course')
    expect(programs?.enums?.pricing).toEqual(['free', 'paid'])
    expect(programs?.enums?.accessMode).toContain('lead-magnet')
  })
})

describe('GET /api/external (manifest endpoint)', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = 'manifest-token-32-chars-loooong!!'
    vi.clearAllMocks()
  })

  it('401s without a Bearer token', async () => {
    const { GET } = await import('../route.js')
    const res = await GET(new NextRequest('http://x/api/external'))
    expect(res.status).toBe(401)
  })

  it('returns the manifest when authed', async () => {
    const { GET } = await import('../route.js')
    const res = await GET(
      new NextRequest('http://x/api/external', {
        headers: { authorization: `Bearer ${process.env.EXTERNAL_API_TOKEN}` },
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data.resources)).toBe(true)
    expect(body.data.resources.length).toBeGreaterThan(5)
  })
})
