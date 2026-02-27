import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ApiClient } from './lib/api-client.js'
import { registerPostTools } from './tools/posts.js'
import { registerProjectTools } from './tools/projects.js'
import { registerMediaTools } from './tools/media.js'

export function createServer(api: ApiClient, baseUrl: string): McpServer {
  const server = new McpServer({
    name: 'devince-mcp',
    version: '1.0.0',
  })

  registerPostTools(server, api, baseUrl)
  registerProjectTools(server, api, baseUrl)
  registerMediaTools(server, api, baseUrl)

  return server
}
