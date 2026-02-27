const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB

interface ApiClientConfig {
  baseUrl: string
  token: string
}

interface ApiResponse<T = unknown> {
  data?: T
  error?: { code: string; message: string }
}

interface ContentData {
  id: number
  title: string
  slug: string
  _status: string
  createdAt: string
  updatedAt: string
}

interface MediaData {
  id: number
  url: string
  filename: string
  mimeType: string
  width: number
  height: number
  sizes: Record<string, { url: string; width: number; height: number }>
}

export type { ContentData, MediaData, ApiResponse }

function extensionFromMimeType(mimeType: string, fallback = 'bin'): string {
  return mimeType.split('/')[1]?.replace('svg+xml', 'svg') || fallback
}

function validateExternalUrl(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return 'Invalid URL format'
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return 'Only HTTP(S) URLs are supported'
  }
  const hostname = parsed.hostname.toLowerCase()
  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('0.') ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    hostname === '169.254.169.254' ||
    hostname.endsWith('.internal') ||
    hostname.startsWith('fc') ||
    hostname.startsWith('fd') ||
    hostname.startsWith('fe80:') ||
    hostname.startsWith('[fc') ||
    hostname.startsWith('[fd') ||
    hostname.startsWith('[fe80:')
  ) {
    return 'Internal/private URLs are not allowed'
  }
  return null
}

export class ApiClient {
  private baseUrl: string
  private token: string

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.token = config.token
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    }
  }

  private url(path: string, locale?: string): string {
    const u = new URL(`/api/external${path}`, this.baseUrl)
    if (locale) u.searchParams.set('locale', locale)
    return u.toString()
  }

  private async parseResponse<T>(res: Response): Promise<ApiResponse<T>> {
    let json: ApiResponse<T>
    try {
      json = (await res.json()) as ApiResponse<T>
    } catch {
      return { error: { code: 'INVALID_RESPONSE', message: `API returned non-JSON response (HTTP ${res.status})` } }
    }
    if (!res.ok && !json.error) {
      return { error: { code: 'HTTP_ERROR', message: `HTTP ${res.status}: ${res.statusText}` } }
    }
    return json
  }

  private async request<T>(method: string, path: string, body?: unknown, locale?: string): Promise<ApiResponse<T>> {
    let res: Response
    try {
      res = await fetch(this.url(path, locale), {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30_000),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { error: { code: 'NETWORK_ERROR', message: `Failed to reach API: ${message}` } }
    }
    return this.parseResponse<T>(res)
  }

  async createPost(data: Record<string, unknown>, locale?: string): Promise<ApiResponse<ContentData>> {
    return this.request<ContentData>('POST', '/posts', data, locale)
  }

  async updatePost(idOrSlug: string, data: Record<string, unknown>, locale?: string): Promise<ApiResponse<ContentData>> {
    return this.request<ContentData>('PATCH', `/posts/${encodeURIComponent(idOrSlug)}`, data, locale)
  }

  async createProject(data: Record<string, unknown>, locale?: string): Promise<ApiResponse<ContentData>> {
    return this.request<ContentData>('POST', '/projects', data, locale)
  }

  async updateProject(idOrSlug: string, data: Record<string, unknown>, locale?: string): Promise<ApiResponse<ContentData>> {
    return this.request<ContentData>('PATCH', `/projects/${encodeURIComponent(idOrSlug)}`, data, locale)
  }

  async uploadMedia(source: { imageUrl: string } | { base64: string; mimeType: string }, alt?: string): Promise<ApiResponse<MediaData>> {
    let blob: Blob
    let filename: string

    if ('imageUrl' in source) {
      const urlError = validateExternalUrl(source.imageUrl)
      if (urlError) {
        return { error: { code: 'INVALID_URL', message: urlError } }
      }

      let res: Response
      try {
        res = await fetch(source.imageUrl, { signal: AbortSignal.timeout(15_000) })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { error: { code: 'IMAGE_FETCH_FAILED', message: `Failed to fetch image from URL: ${message}` } }
      }
      if (!res.ok) {
        return { error: { code: 'FETCH_FAILED', message: `Failed to fetch image from URL: HTTP ${res.status}` } }
      }

      const contentType = (res.headers.get('content-type') || '').split(';')[0].trim()
      if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
        return { error: { code: 'INVALID_TYPE', message: `URL returned unsupported content-type: ${contentType || '(none)'}. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}` } }
      }

      const contentLength = parseInt(res.headers.get('content-length') || '0', 10)
      if (contentLength > MAX_IMAGE_BYTES) {
        return { error: { code: 'FILE_TOO_LARGE', message: `Image exceeds 10MB limit (${Math.round(contentLength / 1024 / 1024)}MB)` } }
      }

      const buffer = await res.arrayBuffer()
      if (buffer.byteLength > MAX_IMAGE_BYTES) {
        return { error: { code: 'FILE_TOO_LARGE', message: `Image exceeds 10MB limit` } }
      }

      blob = new Blob([buffer], { type: contentType })
      filename = `upload.${extensionFromMimeType(contentType, 'jpg')}`
    } else {
      if (!ALLOWED_IMAGE_TYPES.includes(source.mimeType)) {
        return { error: { code: 'INVALID_TYPE', message: `Unsupported image type: ${source.mimeType}. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}` } }
      }
      const buffer = Buffer.from(source.base64, 'base64')
      if (buffer.byteLength > MAX_IMAGE_BYTES) {
        return { error: { code: 'FILE_TOO_LARGE', message: `Image exceeds 10MB limit` } }
      }
      blob = new Blob([buffer], { type: source.mimeType })
      filename = `upload.${extensionFromMimeType(source.mimeType)}`
    }

    const formData = new FormData()
    formData.append('file', blob, filename)
    if (alt) {
      formData.append('alt', alt)
    }

    let res: Response
    try {
      res = await fetch(this.url('/media'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` },
        body: formData,
        signal: AbortSignal.timeout(60_000),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { error: { code: 'UPLOAD_FAILED', message: `Failed to upload media: ${message}` } }
    }
    return this.parseResponse<MediaData>(res)
  }
}
