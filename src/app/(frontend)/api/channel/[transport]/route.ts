// Public channel MCP: /api/channel/mcp (streamable HTTP, stateless, no SSE).
// No auth by design (public film data); per-IP rate limit is the abuse barrier.
import { createMcpHandler } from 'mcp-handler'
import { NextResponse } from 'next/server'
import { CHANNEL_INSTRUCTIONS, registerChannelTools } from '@/utilities/channelMcp'
import { createRateLimiter } from '@/utilities/rateLimit'

const handler = createMcpHandler(
  (server) => registerChannelTools(server),
  { instructions: CHANNEL_INSTRUCTIONS, serverInfo: { name: 'bartek-yt', version: '0.1.0' } },
  { basePath: '/api/channel', disableSse: true },
)

const perIp = createRateLimiter({ max: 60, windowMs: 60_000 })
// JSON-RPC requests here are tiny; anything bigger is abuse.
const MAX_BODY = 64_000

// ponytail: 4th copy of this helper (free-claim, newsletter, session-grant); one shared util when free-claim is refactored for claim_package
function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

const rpcError = (status: number, code: number, message: string, headers?: HeadersInit) =>
  NextResponse.json({ jsonrpc: '2.0', error: { code, message }, id: null }, { status, headers })

async function limited(req: Request): Promise<Response> {
  if (!perIp.check(clientIp(req))) {
    return rpcError(429, -32000, 'Too many requests', { 'Retry-After': '60' })
  }
  if (req.method !== 'POST') return handler(req)

  // mcp-handler parses the body without a catch: bad JSON would leave the
  // request hanging, so it is read, capped and parsed here first.
  const text = await req.text()
  if (text.length > MAX_BODY) return rpcError(413, -32600, 'Request too large')
  try {
    JSON.parse(text)
  } catch {
    return rpcError(400, -32700, 'Parse error')
  }
  return handler(new Request(req, { body: text }))
}

export { limited as GET, limited as POST, limited as DELETE }
