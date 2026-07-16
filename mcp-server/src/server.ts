import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ApiClient } from './lib/api-client.js'
import { registerPostTools } from './tools/posts.js'
import { registerProjectTools } from './tools/projects.js'
import { registerProgramTools } from './tools/programs.js'
import { registerPageTools } from './tools/pages.js'
import { registerMediaTools } from './tools/media.js'
import { registerLessonTools } from './tools/lessons.js'
import { registerProductTools } from './tools/products.js'
import { registerReadTools } from './tools/read.js'

export function createServer(api: ApiClient, baseUrl: string): McpServer {
  const server = new McpServer({
    name: 'devince-mcp',
    version: '1.0.0',
  })

  registerPostTools(server, api, baseUrl)
  registerProjectTools(server, api, baseUrl)
  registerProgramTools(server, api, baseUrl)
  registerPageTools(server, api, baseUrl)
  registerMediaTools(server, api, baseUrl)
  registerLessonTools(server, api, baseUrl)
  registerProductTools(server, api, baseUrl)
  registerReadTools(server, api, baseUrl)

  return server
}
