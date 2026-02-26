# External Content API

REST API for AI agents and external systems to programmatically create and update content on devince.dev.

## Setup

### 1. Generate a token

```bash
openssl rand -hex 32
```

### 2. Add to environment

```bash
# .env
EXTERNAL_API_TOKEN=your-generated-token-here
```

### 3. Restart the server

```bash
pnpm dev    # development
# or redeploy in production (Coolify auto-deploys on push to main)
```

## Authentication

All requests require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <EXTERNAL_API_TOKEN>
```

| Scenario | Response |
|----------|----------|
| Missing `EXTERNAL_API_TOKEN` env var | `503 SERVICE_UNAVAILABLE` |
| Missing or malformed header | `401 AUTH_MISSING` |
| Wrong token | `401 AUTH_INVALID` |

## Response Format

### Success

```json
{
  "data": { ... }
}
```

### Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title is required"
  }
}
```

### Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `AUTH_MISSING` | 401 | No or malformed Authorization header |
| `AUTH_INVALID` | 401 | Token does not match |
| `SERVICE_UNAVAILABLE` | 503 | `EXTERNAL_API_TOKEN` not configured |
| `VALIDATION_ERROR` | 400 | Invalid request body or parameters |
| `NOT_FOUND` | 404 | Resource does not exist |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Localization

All content endpoints accept an optional `locale` query parameter:

- `pl` (default) -- Polish
- `en` -- English

Invalid locale values are silently ignored (defaults to `pl`).

```
POST /api/external/posts?locale=en
```

## Content Format

Content fields (`content` for posts, `description` for projects) accept two formats:

### Markdown (default)

Set `contentFormat: "markdown"` (or omit it) and pass content as a string:

```json
{
  "content": "# Hello World\n\nThis is **bold** and *italic*.\n\n- List item 1\n- List item 2",
  "contentFormat": "markdown"
}
```

Supported markdown features: headings, bold, italic, links, code blocks, lists, horizontal rules.

### Lexical JSON

Set `contentFormat: "lexical"` and pass the native Lexical editor state:

```json
{
  "content": {
    "root": {
      "type": "root",
      "children": [
        {
          "type": "paragraph",
          "children": [
            { "type": "text", "text": "Hello World" }
          ]
        }
      ]
    }
  },
  "contentFormat": "lexical"
}
```

## Endpoints

### Upload Media

```
POST /api/external/media
```

Upload an image file for use as hero images or inline content.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image file |
| `alt` | string | No | Alt text |

**Constraints:**
- Max file size: 10 MB
- Allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml`

**Example:**

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@hero.jpg" \
  -F "alt=Project hero image" \
  https://devince.dev/api/external/media
```

**Response (201):**

```json
{
  "data": {
    "id": 1,
    "url": "/media/hero.jpg",
    "filename": "hero.jpg",
    "mimeType": "image/jpeg",
    "width": 1920,
    "height": 1080,
    "sizes": {
      "thumbnail": { "url": "/media/hero-300x.jpg", "width": 300, "height": 169 },
      "square": { "url": "/media/hero-500x500.jpg", "width": 500, "height": 500 },
      "small": { "url": "/media/hero-600x.jpg", "width": 600, "height": 338 },
      "medium": { "url": "/media/hero-900x.jpg", "width": 900, "height": 506 },
      "large": { "url": "/media/hero-1400x.jpg", "width": 1400, "height": 788 },
      "xlarge": { "url": "/media/hero-1920x.jpg", "width": 1920, "height": 1080 },
      "og": { "url": "/media/hero-1200x630.jpg", "width": 1200, "height": 630 }
    }
  }
}
```

---

### Create Post

```
POST /api/external/posts?locale=pl
```

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Post title |
| `content` | string or object | Yes | Markdown string or Lexical JSON |
| `contentFormat` | `"markdown"` or `"lexical"` | No | Default: `"markdown"` |
| `heroImage` | number | No | Media ID from upload endpoint |
| `categories` | (number or string)[] | No | Category IDs or names |
| `meta` | object | No | SEO metadata (see below) |
| `_status` | `"draft"` or `"published"` | No | Default: `"draft"` |
| `publishedAt` | string | No | ISO 8601 date |
| `authors` | number[] | No | User IDs |

**Meta object:**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | SEO title |
| `description` | string | SEO description |
| `image` | number | Media ID for OG image |

**Categories:** Pass category names as strings and they will be matched to existing categories or created automatically. Pass numeric IDs to reference existing categories directly.

**Example:**

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Getting Started with Next.js 15",
    "content": "# Getting Started\n\nNext.js 15 introduces the App Router...\n\n## Key Features\n\n- Server Components\n- Streaming\n- Partial Prerendering",
    "categories": ["Next.js", "Tutorial"],
    "heroImage": 1,
    "meta": {
      "title": "Getting Started with Next.js 15 | devince.dev",
      "description": "Learn the fundamentals of Next.js 15 App Router"
    },
    "_status": "draft"
  }' \
  https://devince.dev/api/external/posts?locale=pl
```

**Response (201):**

```json
{
  "data": {
    "id": 5,
    "title": "Getting Started with Next.js 15",
    "slug": "getting-started-with-nextjs-15",
    "_status": "draft",
    "createdAt": "2026-02-26T18:30:00.000Z",
    "updatedAt": "2026-02-26T18:30:00.000Z"
  }
}
```

---

### Update Post

```
PATCH /api/external/posts/:idOrSlug?locale=pl
```

Update an existing post by numeric ID or slug. Only include the fields you want to change.

**Content-Type:** `application/json`

All fields from Create Post are optional.

**Examples:**

Publish a draft:

```bash
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"_status": "published"}' \
  https://devince.dev/api/external/posts/getting-started-with-nextjs-15
```

Update content by ID:

```bash
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Updated Content\n\nNew and improved article body.",
    "categories": ["Next.js", "Advanced"]
  }' \
  https://devince.dev/api/external/posts/5
```

**Response (200):**

```json
{
  "data": {
    "id": 5,
    "title": "Getting Started with Next.js 15",
    "slug": "getting-started-with-nextjs-15",
    "_status": "published",
    "createdAt": "2026-02-26T18:30:00.000Z",
    "updatedAt": "2026-02-26T19:00:00.000Z"
  }
}
```

---

### Create Project

```
POST /api/external/projects?locale=pl
```

**Content-Type:** `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Project title |
| `description` | string or object | Yes | Markdown string or Lexical JSON |
| `contentFormat` | `"markdown"` or `"lexical"` | No | Default: `"markdown"` |
| `heroImage` | number | No | Media ID |
| `technologies` | string[] | No | e.g. `["Next.js", "TypeScript"]` |
| `githubUrl` | string | No | Repository URL (must start with `http://` or `https://`) |
| `productionUrl` | string | No | Live site URL (must start with `http://` or `https://`) |
| `meta` | object | No | SEO metadata (same shape as posts) |
| `_status` | `"draft"` or `"published"` | No | Default: `"draft"` |
| `publishedAt` | string | No | ISO 8601 date |

**Example:**

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "devince.dev",
    "description": "# devince.dev\n\nPersonal portfolio and blog built with Payload CMS and Next.js 15.\n\n## Features\n\n- Blog with rich text editor\n- Project showcase\n- Newsletter integration\n- Dark/light theme",
    "technologies": ["Next.js", "TypeScript", "Payload CMS", "PostgreSQL", "TailwindCSS"],
    "githubUrl": "https://github.com/bartek-filipiuk/devince-dev",
    "productionUrl": "https://devince.dev",
    "heroImage": 2,
    "_status": "published"
  }' \
  https://devince.dev/api/external/projects?locale=pl
```

**Response (201):**

```json
{
  "data": {
    "id": 1,
    "title": "devince.dev",
    "slug": "devincedev",
    "_status": "published",
    "createdAt": "2026-02-26T18:45:00.000Z",
    "updatedAt": "2026-02-26T18:45:00.000Z"
  }
}
```

---

### Update Project

```
PATCH /api/external/projects/:idOrSlug?locale=pl
```

Update an existing project by numeric ID or slug. Only include the fields you want to change.

**Content-Type:** `application/json`

All fields from Create Project are optional.

**Example:**

```bash
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "technologies": ["Next.js", "TypeScript", "Payload CMS", "PostgreSQL", "TailwindCSS", "Coolify"],
    "description": "# devince.dev\n\nUpdated description with new deployment info."
  }' \
  https://devince.dev/api/external/projects/devincedev
```

**Response (200):**

```json
{
  "data": {
    "id": 1,
    "title": "devince.dev",
    "slug": "devincedev",
    "_status": "published",
    "createdAt": "2026-02-26T18:45:00.000Z",
    "updatedAt": "2026-02-26T19:15:00.000Z"
  }
}
```

## Complete Workflow Example

A typical workflow for an AI agent creating a blog post with an image:

```bash
TOKEN="your-token-here"
BASE="https://devince.dev/api/external"

# 1. Upload hero image
MEDIA_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@article-hero.png" \
  -F "alt=AI-powered code review" \
  "$BASE/media" | jq '.data.id')

echo "Uploaded media ID: $MEDIA_ID"

# 2. Create post as draft
POST_SLUG=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"AI-Powered Code Review\",
    \"content\": \"# AI-Powered Code Review\n\nHow to use Claude for reviewing pull requests...\",
    \"heroImage\": $MEDIA_ID,
    \"categories\": [\"AI\", \"Development\"],
    \"meta\": {
      \"title\": \"AI-Powered Code Review | devince.dev\",
      \"description\": \"Learn how to leverage AI for better code reviews\"
    },
    \"_status\": \"draft\"
  }" \
  "$BASE/posts?locale=pl" | jq -r '.data.slug')

echo "Created draft post: $POST_SLUG"

# 3. Review in admin panel at /admin/collections/posts

# 4. Publish when ready
curl -s -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"_status": "published"}' \
  "$BASE/posts/$POST_SLUG"

echo "Published!"
```

## Localized Content

To create content in both languages:

```bash
# Create Polish version (default)
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Wprowadzenie do AI", "content": "# AI\n\nTreść po polsku...", "_status": "draft"}' \
  "$BASE/posts?locale=pl"

# Update with English translation
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Introduction to AI", "content": "# AI\n\nContent in English..."}' \
  "$BASE/posts/wprowadzenie-do-ai?locale=en"
```

## Automatic Behaviors

These are handled by Payload CMS hooks -- you don't need to manage them:

- **Slug generation** -- auto-generated from title, no need to pass a slug
- **publishedAt** -- auto-set when `_status` changes to `"published"`
- **ISR revalidation** -- pages are automatically revalidated after create/update
- **Image sizes** -- all configured sizes (thumbnail through og) are auto-generated on upload
- **Versioning** -- drafts and published versions are tracked automatically (up to 50 versions)

## Limits

| Constraint | Value |
|------------|-------|
| Max file size | 10 MB |
| Allowed image types | JPEG, PNG, WebP, GIF, SVG |
| Supported locales | `pl`, `en` |
| Versions per document | 50 |

## Architecture

```
src/app/(frontend)/api/external/
  _lib/
    auth.ts          # Bearer token validation (HMAC timing-safe)
    errors.ts        # Standardized error/success responses
    markdown.ts      # Markdown -> Lexical conversion
    categories.ts    # Category resolution (ID or name -> ID)
    payload.ts       # Shared Payload client, locale, content resolution
    types.ts         # TypeScript interfaces
  media/route.ts     # POST /api/external/media
  posts/
    route.ts         # POST /api/external/posts
    [idOrSlug]/
      route.ts       # PATCH /api/external/posts/:idOrSlug
  projects/
    route.ts         # POST /api/external/projects
    [idOrSlug]/
      route.ts       # PATCH /api/external/projects/:idOrSlug
```

All endpoints use Payload's Local API (`payload.create`, `payload.update`) which gives full hook/validation/versioning support, bypassing the REST API layer for better performance.
