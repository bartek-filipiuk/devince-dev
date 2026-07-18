// Endpoint MCP uczestnika: /api/agent/mcp (streamable HTTP), auth kluczem dvc_
// (verifyAgentKey per request — revoke działa natychmiast, bez sesji).
import configPromise from '@payload-config'
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { getPayload } from 'payload'
import { verifyAgentKey } from '@/utilities/agentApiKeys'
import { registerCohortTools } from '@/utilities/agentMcp'

const handler = createMcpHandler(
  async (server) => {
    const payload = await getPayload({ config: configPromise })
    registerCohortTools(server, payload)
  },
  {},
  { basePath: '/api/agent' },
)

const authed = withMcpAuth(
  handler,
  async (_req, bearer) => {
    if (!bearer) return undefined // → 401 z adaptera
    const payload = await getPayload({ config: configPromise })
    const user = await verifyAgentKey(payload, bearer)
    if (!user) return undefined
    return { token: bearer, clientId: String(user.id), scopes: [], extra: { user } }
  },
  { required: true },
)

export { authed as GET, authed as POST }
