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

## Deploy on Hetzner (Direct Docker)

The MCP server runs as a standalone Docker container behind Traefik on the Hetzner server. It attaches to the `coolify` network so Traefik routes `mcp.devince.dev` to it automatically with TLS.

### Prerequisites

- DNS A record: `mcp.devince.dev` → `65.109.60.26`
- `EXTERNAL_API_TOKEN` set on devince.dev (via Coolify env vars)

### 1. Clone and configure

```bash
ssh hetzner-ax41-1
cd ~
git clone https://github.com/bartek-filipiuk/devince-dev.git mcp-server-deploy
cd mcp-server-deploy/mcp-server
cp .env.example .env
```

Edit `.env`:

| Variable | Value |
|----------|-------|
| `MCP_AUTH_TOKEN` | Generate with `openssl rand -hex 32` |
| `EXTERNAL_API_TOKEN` | Same token configured on devince.dev |
| `DEVINCE_BASE_URL` | `https://devince.dev` |

### 2. Start the container

```bash
docker compose up -d --build
```

Traefik auto-provisions a Let's Encrypt TLS certificate for `mcp.devince.dev`.

### 3. Update (after code changes)

```bash
ssh hetzner-ax41-1
cd ~/mcp-server-deploy
git pull
cd mcp-server
docker compose up -d --build
```

### 4. Verify

```bash
# Health check
curl https://mcp.devince.dev/health

# Test MCP endpoint
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
