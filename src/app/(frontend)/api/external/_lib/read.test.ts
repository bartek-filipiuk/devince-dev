import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { readList, readOne } from './read'

const req = (url: string) => new NextRequest(url)

describe('readList', () => {
  it('paginates, filters by status, and returns the items envelope', async () => {
    const find = vi
      .fn()
      .mockResolvedValue({ docs: [{ id: 1 }, { id: 2 }], page: 2, limit: 5, totalDocs: 12, totalPages: 3 })
    const res = await readList(
      { find } as never,
      'program',
      req('http://x/api/external/programs?page=2&limit=5&status=published'),
    )
    expect(res.status).toBe(200)
    expect(find.mock.calls[0][0]).toMatchObject({
      collection: 'program',
      page: 2,
      limit: 5,
      where: { _status: { equals: 'published' } },
      overrideAccess: true,
      draft: true,
    })
    expect((await res.json()).data).toEqual({
      items: [{ id: 1 }, { id: 2 }],
      page: 2,
      limit: 5,
      total: 12,
      totalPages: 3,
    })
  })

  it('clamps limit to 100 and defaults page=1, limit=20', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [], page: 1, limit: 100, totalDocs: 0, totalPages: 0 })
    await readList({ find } as never, 'lessons', req('http://x/api/external/lessons?limit=9999'))
    expect(find.mock.calls[0][0]).toMatchObject({ page: 1, limit: 100 })

    const find2 = vi.fn().mockResolvedValue({ docs: [], page: 1, limit: 20, totalDocs: 0, totalPages: 0 })
    await readList({ find: find2 } as never, 'lessons', req('http://x/api/external/lessons'))
    expect(find2.mock.calls[0][0]).toMatchObject({ page: 1, limit: 20 })
  })

  it('filters by slug when provided', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [], page: 1, limit: 20, totalDocs: 0, totalPages: 0 })
    await readList({ find } as never, 'products', req('http://x/api/external/products?slug=my-thing'))
    expect(find.mock.calls[0][0].where).toEqual({ slug: { equals: 'my-thing' } })
  })

  it('400s on an invalid locale', async () => {
    const find = vi.fn()
    const res = await readList({ find } as never, 'program', req('http://x/api/external/programs?locale=de'))
    expect(res.status).toBe(400)
    expect(find).not.toHaveBeenCalled()
  })
})

describe('readOne', () => {
  it('fetches by numeric id', async () => {
    const findByID = vi.fn().mockResolvedValue({ id: 7, title: 'X' })
    const res = await readOne({ findByID } as never, 'products', '7', req('http://x/api/external/products/7'))
    expect(findByID.mock.calls[0][0]).toMatchObject({ collection: 'products', id: 7, overrideAccess: true, draft: true })
    expect((await res.json()).data).toEqual({ id: 7, title: 'X' })
  })

  it('resolves a slug, then fetches by id', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 9 }] })
    const findByID = vi.fn().mockResolvedValue({ id: 9, slug: 'my-course' })
    const res = await readOne(
      { find, findByID } as never,
      'program',
      'my-course',
      req('http://x/api/external/programs/my-course'),
    )
    expect(find.mock.calls[0][0].where).toEqual({ slug: { equals: 'my-course' } })
    expect(findByID.mock.calls[0][0].id).toBe(9)
    expect(res.status).toBe(200)
  })

  it('404s when a slug resolves to nothing', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] })
    const res = await readOne({ find } as never, 'program', 'nope', req('http://x/api/external/programs/nope'))
    expect(res.status).toBe(404)
  })

  it('404s when findByID throws a 404', async () => {
    const findByID = vi.fn().mockRejectedValue(Object.assign(new Error('nf'), { status: 404 }))
    const res = await readOne({ findByID } as never, 'products', '123', req('http://x/api/external/products/123'))
    expect(res.status).toBe(404)
  })
})
