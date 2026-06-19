import { describe, it, expect } from 'vitest'
import { highlightCode } from './shikiHighlighter'

describe('highlightCode', () => {
  it('wraps code in a shiki <pre> and keeps the source text', async () => {
    const html = await highlightCode('const a = 1', 'typescript')
    expect(html).toContain('<pre')
    expect(html).toContain('shiki')
    expect(html).toContain('a')
  }, 20000)

  it('falls back to plaintext for an unknown language', async () => {
    const html = await highlightCode('hello world', 'not-a-real-lang')
    expect(html).toContain('<pre')
    expect(html).toContain('hello world')
  }, 20000)
})
