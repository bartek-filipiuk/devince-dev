# MCP Server for devince.dev

Model Context Protocol (MCP) server that exposes devince.dev content management as tools for AI agents like Claude.

## Tools

| Tool | Description |
|------|-------------|
| `create_post` | Create a blog post (markdown content, categories, hero image, SEO) |
| `update_post` | Update a post by ID or slug (publish drafts, edit content) |
| `create_project` | Create a portfolio project (technologies, GitHub/production URLs) |
| `update_project` | Update a project by ID or slug |
| `upload_media` | Upload an image via URL or base64 (returns media ID for posts/projects) |

## Connect from Claude Code

Add to `~/.claude.json` (or project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "devince": {
      "type": "url",
      "url": "https://mcp.devince.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_AUTH_TOKEN"
      }
    }
  }
}
```

Verify with:

```bash
claude mcp list
```

## Deploy on Coolify

### 1. Create a new application

- Source: GitHub repo `bartek-filipiuk/devince-dev`
- Build pack: Dockerfile
- Dockerfile location: `mcp-server/Dockerfile`
- Base directory: `mcp-server`
- Port: 3001

### 2. Set environment variables

| Variable | Value |
|----------|-------|
| `MCP_AUTH_TOKEN` | Generate with `openssl rand -hex 32` |
| `EXTERNAL_API_TOKEN` | Same token configured on devince.dev |
| `DEVINCE_BASE_URL` | `https://devince.dev` |

### 3. Configure domain

- Domain: `mcp.devince.dev`
- Traefik will auto-provision TLS via Let's Encrypt

### 4. Add GitHub Actions secret

Add `COOLIFY_MCP_UUID` to the repo secrets (the Coolify application UUID).

Auto-deploy triggers on push to `main` when `mcp-server/**` files change.

### 5. Verify

```bash
# Health check
curl https://mcp.devince.dev/health

# Test MCP endpoint (should return tool list)
curl -X POST https://mcp.devince.dev/mcp \
  -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
```

## Local Development

```bash
cd mcp-server
cp .env.example .env
# Edit .env with real tokens
npm install
npm run dev
```

Test with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector http://localhost:3001/mcp \
  --header "Authorization: Bearer YOUR_MCP_AUTH_TOKEN"
```

## Architecture

```text
Claude Code  --(HTTPS + Bearer)--> mcp.devince.dev (Traefik)
                                      |
                                   MCP Server (port 3001)
                                      |
                                   https://devince.dev/api/external/*
                                      |
                                   Payload CMS (port 3000)
```

The MCP server is a stateless Streamable HTTP server. Each request creates a fresh `McpServer` instance, processes the MCP call, and cleans up. No session state is maintained.

Authentication uses two independent tokens:
- `MCP_AUTH_TOKEN` — authenticates Claude Code to the MCP server
- `EXTERNAL_API_TOKEN` — authenticates the MCP server to devince.dev's External API
