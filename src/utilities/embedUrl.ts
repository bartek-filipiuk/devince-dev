/**
 * Normalizes a user-supplied video URL into an embeddable iframe `src`.
 *
 * Security boundary for course-landing `CourseVideo` blocks: only `https:` URLs
 * are ever accepted (no `http:`, no `javascript:`, no data URIs, no non-URLs).
 * YouTube and Vimeo are normalized to their canonical embed/player endpoints so
 * a watch/share link still renders; any other valid `https:` URL is passed
 * through unchanged (the course owner is trusted to paste a valid embed URL).
 *
 * @returns the embeddable URL, or `null` if the input is unusable.
 */
export function toEmbedUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  // https-only — reject http:, javascript:, data:, etc.
  if (url.protocol !== 'https:') return null

  const host = url.hostname.toLowerCase().replace(/^www\.|^m\./, '')

  // ---- YouTube ----
  if (host === 'youtube.com') {
    // Already an /embed/<id> URL → normalize host, keep id only.
    const embedMatch = url.pathname.match(/^\/embed\/([^/?#]+)/)
    if (embedMatch) {
      return `https://www.youtube.com/embed/${embedMatch[1]}`
    }
    // watch?v=<id> → embed
    const id = url.searchParams.get('v')
    if (id) {
      return `https://www.youtube.com/embed/${id}`
    }
    // Unknown youtube.com path → pass through unchanged.
    return url.toString()
  }

  if (host === 'youtu.be') {
    const id = url.pathname.replace(/^\//, '').split('/')[0]
    if (id) {
      return `https://www.youtube.com/embed/${id}`
    }
    return url.toString()
  }

  // ---- Vimeo ----
  if (host === 'vimeo.com') {
    const id = url.pathname.replace(/^\//, '').split('/')[0]
    if (id) {
      return `https://player.vimeo.com/video/${id}`
    }
    return url.toString()
  }

  if (host === 'player.vimeo.com') {
    // Already a player URL → keep as-is (idempotent).
    return url.toString()
  }

  // ---- generic https passthrough ----
  return url.toString()
}
