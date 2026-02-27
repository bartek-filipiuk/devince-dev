import express from 'express'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { ApiClient } from './lib/api-client.js'
import { createAuthMiddleware } from './lib/auth.js'
import { createServer } from './server.js'

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason)
})

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`${name} environment variable is required`)
    process.exit(1)
  }
  return value
}

const MCP_AUTH_TOKEN = requireEnv('MCP_AUTH_TOKEN')
const EXTERNAL_API_TOKEN = requireEnv('EXTERNAL_API_TOKEN')
const DEVINCE_BASE_URL = requireEnv('DEVINCE_BASE_URL')

const api = new ApiClient({ baseUrl: DEVINCE_BASE_URL, token: EXTERNAL_API_TOKEN })
const authMiddleware = createAuthMiddleware(MCP_AUTH_TOKEN)

const app = express()
app.use(express.json({ limit: '15mb' }))

// Health check (unauthenticated, for Coolify/Traefik)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', server: 'devince-mcp', version: '1.0.0' })
})

// MCP endpoint (authenticated, stateless)
app.post('/mcp', authMiddleware, async (req, res) => {
  try {
    const server = createServer(api, DEVINCE_BASE_URL)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })

    res.on('close', () => {
      transport.close().catch((err) => console.error('Failed to close transport:', err))
      server.close().catch((err) => console.error('Failed to close server:', err))
    })

    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (err) {
    console.error('MCP request error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
    }
  }
})

// Method not allowed for non-POST on /mcp (stateless server)
app.all('/mcp', (_req, res) => {
  res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST for MCP requests' } })
})

const PORT = parseInt(process.env.PORT || '3001', 10)
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`Invalid PORT: "${process.env.PORT}". Must be 1-65535.`)
  process.exit(1)
}

const httpServer = app.listen(PORT, '0.0.0.0', () => {
  console.log(`devince-mcp server listening on port ${PORT}`)
  console.log(`  Health: http://0.0.0.0:${PORT}/health`)
  console.log(`  MCP:    http://0.0.0.0:${PORT}/mcp`)
})

httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`)
  } else {
    console.error('Failed to start server:', err)
  }
  process.exit(1)
})
