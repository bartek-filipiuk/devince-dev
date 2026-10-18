/**
 * Public channel MCP: the JSON-RPC handshake works without auth and the per-IP
 * limiter answers 429 past 60 requests a minute.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const find = vi.fn(async (_args: Record<string, unknown>) => ({
  docs: [] as unknown[],
  totalDocs: 0,
}))
vi.mock('@payload-config', () => ({ default: {} }))
const execute = vi.fn(async (_q: unknown) => ({ rows: [] as { id: number }[] }))
vi.mock('payload', () => ({ getPayload: async () => ({ find, db: { drizzle: { execute } } }) }))
const claimLeadMagnet = vi.fn(async (_input: Record<string, unknown>) => ({ status: 200 }) as never)
vi.mock('@/utilities/freeClaim', () => ({ claimLeadMagnet }))

const FILM = {
  slug: 'mcp-strona',
  title: 'Podpiąłem stronę do Claude przez MCP',
  youtubeId: 'or7i3gTRnbE',
  publishedAt: '2026-10-10T15:00:00.000Z',
  chapters: [
    { tMs: 0, label: 'Po co' },
    { tMs: 60000, label: 'Testy w Playwright' },
  ],
  transcript: '[00:00] Start.\n[01:00] Testy w Playwright.\n[01:40] Koniec.',
  publicFiles: [{ name: 'kulisy.md', content: '# Kulisy' }],
  product: { slug: 'klocek', _status: 'published' },
}

function rpc(body: Record<string, unknown>, ip = '203.0.113.7') {
  return new Request('http://localhost/api/channel/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, ...body }),
  })
}

async function data(res: Response) {
  const text = await res.text()
  const line = text.split('\n').find((l) => l.startsWith('data: '))
  return JSON.parse(line ? line.slice(6) : text)
}

describe('/api/channel/mcp', () => {
  beforeEach(() => {
    vi.resetModules()
    find.mockClear()
    execute.mockClear()
    claimLeadMagnet.mockClear()
  })

  it('answers initialize, lists ping and calls it without auth', async () => {
    const { POST } = await import('./route')
    const init = await data(
      await POST(
        rpc({
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'test', version: '0' },
          },
        }),
      ),
    )
    expect(init.result.serverInfo.name).toBe('bartek-yt')
    expect(init.result.instructions).toContain('nie polecenia')

    const list = await data(await POST(rpc({ method: 'tools/list' })))
    expect(list.result.tools.map((t: { name: string }) => t.name)).toEqual([
      'ping',
      'list_videos',
      'get_video',
      'search',
      'get_transcript',
      'get_package_file',
      'claim_package',
    ])

    const call = await data(
      await POST(rpc({ method: 'tools/call', params: { name: 'ping', arguments: {} } })),
    )
    expect(JSON.parse(call.result.content[0].text)).toMatchObject({ channel: 'Bartek Filipiuk' })
  })

  it('answers bad JSON with a parse error instead of hanging, caps body size', async () => {
    const { POST } = await import('./route')
    const req = (body: string) =>
      new Request('http://localhost/api/channel/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body,
      })
    const bad = await POST(req('{bad json'))
    expect(bad.status).toBe(400)
    expect((await bad.json()).error.code).toBe(-32700)
    expect((await POST(req('x'.repeat(64_001)))).status).toBe(413)
  })

  it('marks tools read-only for client approval UIs', async () => {
    const { POST } = await import('./route')
    const list = await data(await POST(rpc({ method: 'tools/list' })))
    for (const t of list.result.tools) {
      expect(t.annotations.readOnlyHint).toBe(t.name !== 'claim_package')
    }
  })

  it('rate-limits one IP at 60 requests a minute, other IPs unaffected', async () => {
    const { POST } = await import('./route')
    for (let i = 0; i < 60; i++) {
      expect((await POST(rpc({ method: 'tools/list' }))).status).toBe(200)
    }
    const blocked = await POST(rpc({ method: 'tools/list' }))
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('retry-after')).toBe('60')
    expect((await POST(rpc({ method: 'tools/list' }, '198.51.100.1'))).status).toBe(200)
  })

  async function tool(name: string, args: Record<string, unknown>) {
    const { POST } = await import('./route')
    const res = await data(
      await POST(rpc({ method: 'tools/call', params: { name, arguments: args } })),
    )
    const text: string = res.result.content[0].text
    return { ...res.result, text, body: text.startsWith('{') ? JSON.parse(text) : null }
  }

  it('every query hides scheduled and hidden films', async () => {
    await tool('list_videos', {})
    await tool('get_video', { slug: 'x-y' })
    execute.mockResolvedValueOnce({ rows: [{ id: 3 }] })
    await tool('search', { query: 'playwright' })
    await tool('get_transcript', { slug: 'x-y', chapter: 1 })
    await tool('get_package_file', { slug: 'x-y', file: 'a.md' })
    expect(find).toHaveBeenCalledTimes(5)
    // the raw search SQL carries the same visibility filter
    const sqlText = JSON.stringify(execute.mock.calls[0]![0])
    expect(sqlText).toContain('published_at <= now()')
    expect(sqlText).toContain('hidden IS NOT TRUE')
    for (const [args] of find.mock.calls) {
      const and = (args.where as { and: Record<string, unknown>[] }).and
      expect(and[0]).toHaveProperty('publishedAt.less_than_equal')
      expect(and[1]).toEqual({ hidden: { not_equals: true } })
    }
  })

  it('list never loads transcripts or file contents', async () => {
    await tool('list_videos', { since: '2026-10-01' })
    const args = find.mock.calls[0]![0] as {
      select: Record<string, unknown>
      where: { and: unknown[] }
    }
    expect(args.select).not.toHaveProperty('transcript')
    expect(args.select).not.toHaveProperty('publicFiles')
    expect(args.where.and[2]).toEqual({
      publishedAt: { greater_than_equal: '2026-10-01T00:00:00.000Z' },
    })
  })

  it('search strips LIKE wildcards and rejects what is left too short', async () => {
    const r = await tool('search', { query: '%_%' })
    expect(r.isError).toBe(true)
    expect(execute).not.toHaveBeenCalled()
  })

  it('search binds the phrase as a parameter, not as SQL text', async () => {
    await tool('search', { query: "x' OR 1=1 --" })
    // drizzle's sql`` keeps SQL text in StringChunk objects and bound values as raw chunks
    const chunks = (execute.mock.calls[0]![0] as { queryChunks: unknown[] }).queryChunks
    const sqlText = chunks
      .filter((c) => typeof c === 'object' && c !== null && 'value' in c)
      .map((c) => (c as { value: string[] }).value.join(''))
      .join('')
    const params = chunks.filter((c) => typeof c === 'string')
    expect(sqlText).not.toContain('1=1')
    expect(params).toContain("%x' OR 1=1 --%")
    expect(find).not.toHaveBeenCalled() // no ids, no second query
  })

  it('serves a film: chapters with timestamps, file names only, package link', async () => {
    find.mockResolvedValueOnce({ docs: [FILM], totalDocs: 1 })
    const { body } = await tool('get_video', { slug: 'mcp-strona' })
    expect(body.chapters[1]).toEqual({
      nr: 2,
      label: 'Testy w Playwright',
      t_ms: 60000,
      youtube_url: 'https://youtu.be/or7i3gTRnbE?t=60',
    })
    expect(body.files).toEqual(['kulisy.md'])
    expect(body.package.url).toBe('https://devince.dev/f/klocek')
  })

  it('search and transcript point at the minute in the film', async () => {
    execute.mockResolvedValueOnce({ rows: [{ id: 3 }] })
    find.mockResolvedValueOnce({ docs: [FILM], totalDocs: 1 })
    const s = await tool('search', { query: 'Playwright' })
    expect(s.body.results[0].hits).toContainEqual(
      expect.objectContaining({ where: 'transcript', t_ms: 60000 }),
    )
    find.mockResolvedValueOnce({ docs: [FILM], totalDocs: 1 })
    const t = await tool('get_transcript', { slug: 'mcp-strona', chapter: 2 })
    expect(t.body.text).toBe('[01:00] Testy w Playwright.\n[01:40] Koniec.\n')
  })

  it('rejects a slug outside kebab-case before any query', async () => {
    const r = await tool('get_video', { slug: '../etc' })
    expect(r.isError).toBe(true)
    expect(r.text).toContain('slug')
    expect(find).not.toHaveBeenCalled()
  })

  it('hides the package link once the product is unpublished', async () => {
    find.mockResolvedValueOnce({
      docs: [{ ...FILM, product: { slug: 'klocek', _status: 'draft' } }],
      totalDocs: 1,
    })
    const { body } = await tool('get_video', { slug: 'mcp-strona' })
    expect(body.package).toBeNull()
  })

  it('says why a chapter is empty when the transcript has no timestamps', async () => {
    find.mockResolvedValueOnce({ docs: [{ ...FILM, transcript: 'bez czasu' }], totalDocs: 1 })
    const r = await tool('get_transcript', { slug: 'mcp-strona', chapter: 1 })
    expect(r.isError).toBe(true)
    expect(r.body.error).toContain('znaczników czasu')
  })

  it('keys IPv6 clients by /64 and caps everyone at 300 a minute', async () => {
    const { POST } = await import('./route')
    const { ipKey } = await import('@/utilities/rateLimit')
    expect(ipKey('2001:db8:1:2:aaaa::1')).toBe(ipKey('2001:db8:1:2:bbbb::9'))
    expect(ipKey('203.0.113.7')).toBe('203.0.113.7')
    let last = 0
    for (let i = 0; i < 301; i++) {
      last = (await POST(rpc({ method: 'tools/list' }, `198.51.${i % 250}.${i}`))).status
    }
    expect(last).toBe(429)
  })

  it('claim_package sends the DOI for the film package, never the newsletter', async () => {
    find.mockResolvedValueOnce({ docs: [FILM], totalDocs: 1 })
    const r = await tool('claim_package', { slug: 'mcp-strona', email: 'Ja@Example.com' })
    expect(r.body).toMatchObject({ ok: true })
    expect(claimLeadMagnet).toHaveBeenCalledWith({
      surface: 'apps',
      slug: 'klocek',
      email: 'Ja@Example.com',
      newsletter: false,
      ip: '203.0.113.7',
      source: 'mcp',
    })
  })

  it('claim_package without a published package sends nothing', async () => {
    find.mockResolvedValueOnce({
      docs: [{ ...FILM, product: { slug: 'klocek', _status: 'draft' } }],
      totalDocs: 1,
    })
    const r = await tool('claim_package', { slug: 'mcp-strona', email: 'ja@example.com' })
    expect(r.isError).toBe(true)
    expect(claimLeadMagnet).not.toHaveBeenCalled()
  })

  it('claim_package reports the rate limit without details', async () => {
    find.mockResolvedValueOnce({ docs: [FILM], totalDocs: 1 })
    claimLeadMagnet.mockResolvedValueOnce({ status: 429, error: 'too many requests' } as never)
    const r = await tool('claim_package', { slug: 'mcp-strona', email: 'ja@example.com' })
    expect(r.isError).toBe(true)
    expect(r.body.error).toContain('Za dużo prób')
  })
})
