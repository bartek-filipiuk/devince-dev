/**
 * Public channel MCP: the JSON-RPC handshake works without auth and the per-IP
 * limiter answers 429 past 60 requests a minute.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

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
  beforeEach(() => vi.resetModules())

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
    expect(list.result.tools.map((t: { name: string }) => t.name)).toEqual(['ping'])

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
    expect(list.result.tools[0].annotations).toMatchObject({ readOnlyHint: true })
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
})
