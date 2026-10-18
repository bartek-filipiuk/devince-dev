/**
 * PUT /api/external/videos/:slug — the video pipeline's idempotent export.
 * Payload is mocked; we assert validation and what would be written.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('../_lib/payload.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../_lib/payload.js')>()
  return { ...original, getPayloadClient: vi.fn() }
})

const TOKEN = 'test-secret-token-32-chars-long!!'

const VALID = {
  title: 'Opus 5.5 vs GPT-6: jedna gra',
  youtubeId: 'AyCDyb1KVHk',
  publishedAt: '2026-10-18T10:00:00+02:00',
  summary: 'Dwa modele, ten sam prompt.',
  tags: ['Claude Opus 5.5', 'GPT-6'],
  chapters: [
    { tMs: 0, label: 'Werdykt' },
    { tMs: 61000, label: 'Zasady gry' },
  ],
  transcript: '[00:00] Dwa modele.\n[01:01] Zasady.',
  publicFiles: [{ name: 'kulisy.md', content: '# Kulisy' }],
  productSlug: 'klocek',
}

function put(slug: string, body: unknown, token = TOKEN) {
  return new NextRequest(`http://localhost/api/external/videos/${slug}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function call(slug: string, body: unknown, token?: string) {
  const { PUT } = await import('./[slug]/route.js')
  return PUT(put(slug, body, token), { params: Promise.resolve({ slug }) })
}

function mockPayload(opts: { existing?: boolean; product?: boolean; taken?: boolean } = {}) {
  const find = vi.fn(
    async ({ collection, where }: { collection: string; where: Record<string, unknown> }) => ({
      docs:
        collection === 'products'
          ? opts.product === false
            ? []
            : [{ id: 8 }]
          : 'youtubeId' in where
            ? opts.taken
              ? [{ id: 9, slug: 'inny' }]
              : []
            : opts.existing
              ? [{ id: 5 }]
              : [],
    }),
  )
  const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 6, ...data }))
  const update = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 5, ...data }))
  return { find, create, update }
}

describe('PUT /api/external/videos/:slug', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_TOKEN = TOKEN
    vi.clearAllMocks()
  })

  it('rejects a wrong token before touching the database', async () => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const res = await call('klocek', VALID, 'wrong')
    expect(res.status).toBe(401)
    expect(getPayloadClient).not.toHaveBeenCalled()
  })

  it('creates a new film with the product resolved from its slug', async () => {
    const p = mockPayload()
    const { getPayloadClient } = await import('../_lib/payload.js')
    vi.mocked(getPayloadClient).mockResolvedValue(p as never)

    const res = await call('opus-vs-gpt6', VALID)
    expect(res.status).toBe(201)
    const data = p.create.mock.calls[0]![0].data
    expect(data).toMatchObject({
      slug: 'opus-vs-gpt6',
      youtubeId: 'AyCDyb1KVHk',
      publishedAt: '2026-10-18T08:00:00.000Z',
      hidden: false,
      product: 8,
    })
    expect(data).not.toHaveProperty('productSlug')
  })

  it('re-export updates the same document (idempotent)', async () => {
    const p = mockPayload({ existing: true })
    const { getPayloadClient } = await import('../_lib/payload.js')
    vi.mocked(getPayloadClient).mockResolvedValue(p as never)

    const res = await call('opus-vs-gpt6', { ...VALID, productSlug: null })
    expect(res.status).toBe(200)
    expect(p.create).not.toHaveBeenCalled()
    expect(p.update.mock.calls[0]![0]).toMatchObject({ id: 5, data: { product: null } })
  })

  it('sorts chapters and only links a published product', async () => {
    const p = mockPayload()
    const { getPayloadClient } = await import('../_lib/payload.js')
    vi.mocked(getPayloadClient).mockResolvedValue(p as never)

    await call('opus-vs-gpt6', {
      ...VALID,
      chapters: [
        { tMs: 61000, label: 'B' },
        { tMs: 0, label: 'A' },
      ],
    })
    const chapters = p.create.mock.calls[0]![0].data.chapters as { label: string }[]
    expect(chapters.map((c) => c.label)).toEqual(['A', 'B'])
    const productQuery = p.find.mock.calls.find((c) => c[0].collection === 'products')![0]
    expect(productQuery.where).toMatchObject({ _status: { equals: 'published' } })
  })

  it('unknown product slug is a 400, nothing written', async () => {
    const p = mockPayload({ product: false })
    const { getPayloadClient } = await import('../_lib/payload.js')
    vi.mocked(getPayloadClient).mockResolvedValue(p as never)

    expect((await call('opus-vs-gpt6', VALID)).status).toBe(400)
    expect(p.create).not.toHaveBeenCalled()
  })

  it('same YouTube film under another slug is a 400, nothing written', async () => {
    const p = mockPayload({ taken: true })
    const { getPayloadClient } = await import('../_lib/payload.js')
    vi.mocked(getPayloadClient).mockResolvedValue(p as never)

    const res = await call('opus-vs-gpt6', VALID)
    expect(res.status).toBe(400)
    expect((await res.json()).error.message).toContain('inny')
    expect(p.create).not.toHaveBeenCalled()
  })

  it.each([
    ['slug', 'Bad Slug', VALID],
    ['youtubeId', 'ok', { ...VALID, youtubeId: 'x' }],
    ['publishedAt', 'ok', { ...VALID, publishedAt: 'jutro' }],
    ['file name with path', 'ok', { ...VALID, publicFiles: [{ name: '../x.md', content: 'a' }] }],
    ['file type', 'ok', { ...VALID, publicFiles: [{ name: 'run.sh', content: 'a' }] }],
    [
      'duplicate files',
      'ok',
      {
        ...VALID,
        publicFiles: [
          { name: 'a.md', content: '1' },
          { name: 'a.md', content: '2' },
        ],
      },
    ],
    ['chapter tMs', 'ok', { ...VALID, chapters: [{ tMs: -1, label: 'x' }] }],
    ['too many tags', 'ok', { ...VALID, tags: Array.from({ length: 31 }, (_, i) => `t${i}`) }],
    ['transcript size', 'ok', { ...VALID, transcript: 'a'.repeat(200_001) }],
    ['hidden type', 'ok', { ...VALID, hidden: 'true' }],
    ['NUL byte', 'ok', { ...VALID, transcript: 'a\u0000b' }],
    [
      'ANSI escape in file',
      'ok',
      { ...VALID, publicFiles: [{ name: 'a.md', content: '\u001b[31mred' }] },
    ],
    ['lone surrogate', 'ok', { ...VALID, title: 'x\ud800' }],
    ['chapter beyond 24 h', 'ok', { ...VALID, chapters: [{ tMs: 1e300, label: 'x' }] }],
    ['array body', 'ok', [VALID]],
    ['invalid JSON', 'ok', '{nope'],
  ])('400 on bad %s', async (_label, slug, body) => {
    const { getPayloadClient } = await import('../_lib/payload.js')
    const res = await call(slug, body)
    expect(res.status).toBe(400)
    expect(getPayloadClient).not.toHaveBeenCalled()
  })

  it('rejects an oversized body before parsing', async () => {
    const res = await call('ok', 'x'.repeat(1_000_001))
    expect(res.status).toBe(400)
  })
})
