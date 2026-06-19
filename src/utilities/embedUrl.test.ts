import { describe, it, expect } from 'vitest'
import { toEmbedUrl } from './embedUrl'

describe('toEmbedUrl', () => {
  // ---- YouTube ----
  it('converts a youtube watch URL to an embed URL', () => {
    expect(toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('converts a youtu.be short URL to an embed URL', () => {
    expect(toEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('is idempotent on an already-embed youtube URL', () => {
    expect(toEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('converts a mobile youtube watch URL to an embed URL', () => {
    expect(toEmbedUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('strips extra query params from a youtube watch URL', () => {
    expect(
      toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxyz&t=42s&feature=share'),
    ).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  // ---- Vimeo ----
  it('converts a vimeo URL to a player URL', () => {
    expect(toEmbedUrl('https://vimeo.com/123456789')).toBe(
      'https://player.vimeo.com/video/123456789',
    )
  })

  it('is idempotent on an already-player vimeo URL', () => {
    expect(toEmbedUrl('https://player.vimeo.com/video/123456789')).toBe(
      'https://player.vimeo.com/video/123456789',
    )
  })

  // ---- generic passthrough ----
  it('returns any other valid https URL unchanged', () => {
    expect(toEmbedUrl('https://example.com/embed/abc')).toBe('https://example.com/embed/abc')
  })

  it('trims surrounding whitespace before processing', () => {
    expect(toEmbedUrl('  https://youtu.be/dQw4w9WgXcQ  ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  // ---- rejections ----
  it('rejects an http (non-https) URL', () => {
    expect(toEmbedUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull()
  })

  it('rejects a non-URL string', () => {
    expect(toEmbedUrl('notaurl')).toBeNull()
  })

  it('rejects an empty string', () => {
    expect(toEmbedUrl('')).toBeNull()
  })
})
