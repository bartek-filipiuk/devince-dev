export interface GalleryItem {
  url: string
  alt: string
  caption: string | null
}

export interface ScreenshotRow {
  image?: unknown
  caption?: string | null
}

/**
 * Map a product's `screenshots` rows to renderable gallery items. Pure: the
 * media-url resolver is injected so it can be unit-tested without Payload.
 * Rows whose `image` is unpopulated (a numeric id at shallow depth) or yields
 * no url are skipped; caption falls back to the image alt, then `fallbackAlt`.
 */
export function resolveScreenshots(
  rows: ScreenshotRow[] | null | undefined,
  fallbackAlt: string,
  getUrl: (url: string | null | undefined) => string | null,
): GalleryItem[] {
  const out: GalleryItem[] = []
  for (const row of rows ?? []) {
    const img = row?.image as { url?: string | null; alt?: string | null } | null | undefined
    if (!img || typeof img !== 'object') continue
    const url = getUrl(img.url)
    if (!url) continue
    const caption = typeof row.caption === 'string' && row.caption.length > 0 ? row.caption : null
    out.push({ url, alt: caption ?? img.alt ?? fallbackAlt, caption })
  }
  return out
}
