/**
 * Validation for PUT /api/external/videos/:slug (the video pipeline's export).
 * Everything here ends up in front of other people's agents through the public
 * channel MCP, so every field is typed, length-capped and allow-listed.
 */

import { VIDEO_LIMITS } from '@/collections/Videos'

export { VIDEO_LIMITS }

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/
const FILE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}\.(md|txt)$/

const MAX_T_MS = 24 * 3_600_000

export type VideoData = {
  slug: string
  title: string
  youtubeId: string
  publishedAt: string
  hidden: boolean
  summary: string | null
  description: string | null
  tags: string[]
  chapters: { tMs: number; label: string }[]
  transcript: string | null
  publicFiles: { name: string; content: string }[]
  productSlug: string | null
}

const L = VIDEO_LIMITS
// Postgres rejects NUL and lone surrogates (500 instead of 400); other control
// characters (ANSI escapes from terminal logs) must not reach other people's agents.
// \t \n \r stay.
const UNSAFE_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/
const str = (v: unknown, max: number) =>
  typeof v === 'string' && v.length <= max && !UNSAFE_CHARS.test(v)

function optText(body: Record<string, unknown>, key: string, max: number): string | null | Error {
  const v = body[key]
  if (v === undefined || v === null || v === '') return null
  return str(v, max) ? (v as string) : new Error(`${key} must be a string of at most ${max} chars`)
}

export function parseVideo(slug: string, body: unknown): VideoData | Error {
  if (!str(slug, L.slug) || !SLUG_RE.test(slug)) return new Error('slug must be kebab-case a-z0-9')
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return new Error('body must be a JSON object')
  const b = body as Record<string, unknown>

  if (!str(b.title, L.title) || !(b.title as string).trim())
    return new Error(`title is required (≤ ${L.title} chars)`)
  if (typeof b.youtubeId !== 'string' || !YOUTUBE_ID_RE.test(b.youtubeId))
    return new Error('youtubeId must be an 11-char YouTube id')
  if (typeof b.publishedAt !== 'string' || Number.isNaN(Date.parse(b.publishedAt)))
    return new Error('publishedAt must be an ISO date')
  if (b.hidden !== undefined && typeof b.hidden !== 'boolean')
    return new Error('hidden must be a boolean')

  const summary = optText(b, 'summary', L.summary)
  if (summary instanceof Error) return summary
  const description = optText(b, 'description', L.description)
  if (description instanceof Error) return description
  const transcript = optText(b, 'transcript', L.transcript)
  if (transcript instanceof Error) return transcript

  const tags = b.tags ?? []
  if (
    !Array.isArray(tags) ||
    tags.length > L.tags ||
    tags.some((t) => !str(t, L.tag) || !t.trim())
  ) {
    return new Error(`tags must be at most ${L.tags} non-empty strings of ≤ ${L.tag} chars`)
  }

  const chapters = b.chapters ?? []
  if (
    !Array.isArray(chapters) ||
    chapters.length > L.chapters ||
    chapters.some(
      (c) =>
        !c ||
        typeof c !== 'object' ||
        !Number.isInteger(c.tMs) ||
        c.tMs < 0 ||
        c.tMs > MAX_T_MS ||
        !str(c.label, L.chapterLabel) ||
        !c.label.trim(),
    )
  ) {
    return new Error(
      `chapters must be at most ${L.chapters} items {tMs: int ≥ 0, label ≤ ${L.chapterLabel} chars}`,
    )
  }

  const files = b.publicFiles ?? []
  if (
    !Array.isArray(files) ||
    files.length > L.files ||
    files.some(
      (f) =>
        !f ||
        typeof f !== 'object' ||
        typeof f.name !== 'string' ||
        !FILE_NAME_RE.test(f.name) ||
        !str(f.content, L.fileContent),
    )
  ) {
    return new Error(
      `publicFiles must be at most ${L.files} items {name: *.md|*.txt, content ≤ ${L.fileContent} chars}`,
    )
  }
  if (new Set(files.map((f: { name: string }) => f.name)).size !== files.length)
    return new Error('publicFiles names must be unique')

  const productSlug = b.productSlug ?? null
  if (productSlug !== null && (typeof productSlug !== 'string' || !SLUG_RE.test(productSlug))) {
    return new Error('productSlug must be a product slug or null')
  }

  return {
    slug,
    title: (b.title as string).trim(),
    youtubeId: b.youtubeId,
    publishedAt: new Date(b.publishedAt).toISOString(),
    hidden: b.hidden === true,
    summary,
    description,
    tags: tags.map((t: string) => t.trim()),
    chapters: chapters
      .map((c: { tMs: number; label: string }) => ({ tMs: c.tMs, label: c.label.trim() }))
      .sort((a: { tMs: number }, b: { tMs: number }) => a.tMs - b.tMs),
    transcript,
    publicFiles: files.map((f: { name: string; content: string }) => ({
      name: f.name,
      content: f.content,
    })),
    productSlug,
  }
}
