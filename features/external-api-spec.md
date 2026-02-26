# External Content API for AI Agents

## Overview

REST API enabling AI agents (Claude, etc.) to programmatically create and update blog posts, projects, and media in the devince.dev Payload CMS instance.

## Authentication

All endpoints require a static Bearer token via the `Authorization` header.

```
Authorization: Bearer <EXTERNAL_API_TOKEN>
```

- Token is stored in `EXTERNAL_API_TOKEN` environment variable
- Returns `503` if env var is not configured (fail-closed)
- Returns `401` if token is missing or invalid
- Uses timing-safe comparison (`crypto.timingSafeEqual`)

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
    "message": "Human-readable description",
    "details": { ... }
  }
}
```

## Localization

All endpoints accept an optional `locale` query parameter:
- `pl` (default) — Polish
- `en` — English

## Endpoints

### POST /api/external/media

Upload an image file.

**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image file (JPEG, PNG, WebP, SVG, GIF) |
| `alt` | string | No | Alt text for the image |

**Response** (201):
```json
{
  "data": {
    "id": 1,
    "url": "/media/image.jpg",
    "filename": "image.jpg",
    "mimeType": "image/jpeg",
    "width": 1920,
    "height": 1080,
    "sizes": {
      "thumbnail": { "url": "/media/image-300x.jpg", "width": 300 },
      "small": { "url": "/media/image-600x.jpg", "width": 600 },
      "medium": { "url": "/media/image-900x.jpg", "width": 900 },
      "large": { "url": "/media/image-1400x.jpg", "width": 1400 }
    }
  }
}
```

---

### POST /api/external/posts

Create a new blog post.

**Content-Type**: `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Post title |
| `content` | string/object | Yes | Markdown string or Lexical JSON |
| `contentFormat` | `"markdown"` \| `"lexical"` | No | Default: `"markdown"` |
| `heroImage` | number | No | Media ID for hero image |
| `categories` | (number\|string)[] | No | Category IDs or names (created if missing) |
| `meta` | object | No | `{ title?, description?, image? }` |
| `_status` | `"draft"` \| `"published"` | No | Default: `"draft"` |
| `publishedAt` | string | No | ISO 8601 date |
| `authors` | number[] | No | User IDs |

**Response** (201):
```json
{
  "data": {
    "id": 1,
    "title": "My Post",
    "slug": "my-post",
    "_status": "draft",
    "createdAt": "2026-02-26T12:00:00.000Z",
    "updatedAt": "2026-02-26T12:00:00.000Z"
  }
}
```

---

### PATCH /api/external/posts/:idOrSlug

Update an existing blog post. Accepts numeric ID or slug string.

**Content-Type**: `application/json`

All fields from POST are optional. Only included fields are updated.

**Response** (200): Same shape as POST response.

---

### POST /api/external/projects

Create a new project.

**Content-Type**: `application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Project title |
| `description` | string/object | Yes | Markdown string or Lexical JSON |
| `contentFormat` | `"markdown"` \| `"lexical"` | No | Default: `"markdown"` |
| `heroImage` | number | No | Media ID for hero image |
| `technologies` | string[] | No | e.g. `["Next.js", "TypeScript"]` |
| `githubUrl` | string | No | Repository URL |
| `productionUrl` | string | No | Live site URL |
| `meta` | object | No | `{ title?, description?, image? }` |
| `_status` | `"draft"` \| `"published"` | No | Default: `"draft"` |
| `publishedAt` | string | No | ISO 8601 date |

**Response** (201):
```json
{
  "data": {
    "id": 1,
    "title": "My Project",
    "slug": "my-project",
    "_status": "draft",
    "createdAt": "2026-02-26T12:00:00.000Z",
    "updatedAt": "2026-02-26T12:00:00.000Z"
  }
}
```

---

### PATCH /api/external/projects/:idOrSlug

Update an existing project. Accepts numeric ID or slug string.

**Content-Type**: `application/json`

All fields from POST are optional. Only included fields are updated.

**Response** (200): Same shape as POST response.

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_MISSING` | 401 | No Authorization header |
| `AUTH_INVALID` | 401 | Invalid token |
| `SERVICE_UNAVAILABLE` | 503 | EXTERNAL_API_TOKEN not configured |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Notes

- Posts and projects use Payload's versioning system (drafts supported)
- Slug is auto-generated from title by Payload hooks
- `publishedAt` is auto-set when `_status` changes to `"published"`
- ISR revalidation fires automatically via Payload's `afterChange` hooks
- Categories are resolved by ID or title; new categories are created on-the-fly
- Technologies array (`["Next.js"]`) is transformed to `[{name: "Next.js"}]` for Payload
