import { describe, expect, it, vi } from 'vitest'

import {
  getBuildLogEntries,
  getCurrentlyBuilding,
  getPlatformStats,
} from './buildLog'

const post = (slug: string, publishedAt: string, title = slug) => ({
  slug,
  title,
  publishedAt,
})

function fakePayload({
  posts = [] as ReturnType<typeof post>[],
  projects = [] as ReturnType<typeof post>[],
  roadmapItems = [] as { title: string; status: string }[],
} = {}) {
  return {
    find: vi.fn(async ({ collection }: { collection: string }) => {
      if (collection === 'posts') return { docs: posts, totalDocs: posts.length }
      if (collection === 'projects') return { docs: projects, totalDocs: projects.length }
      if (collection === 'program') return { docs: [], totalDocs: 3 }
      throw new Error(`unexpected collection ${collection}`)
    }),
    findGlobal: vi.fn(async () => ({ items: roadmapItems })),
  }
}

describe('getBuildLogEntries', () => {
  it('merges posts and projects sorted by publishedAt desc and applies limit', async () => {
    const payload = fakePayload({
      posts: [post('p-new', '2026-07-01'), post('p-old', '2026-05-01')],
      projects: [post('proj-mid', '2026-06-01')],
    })
    const entries = await getBuildLogEntries(payload, 'pl', 2)
    expect(entries.map((e) => e.title)).toEqual(['p-new', 'proj-mid'])
    expect(entries[0]).toMatchObject({ kind: 'post', href: '/posts/p-new' })
    expect(entries[1]).toMatchObject({ kind: 'project', href: '/projects/proj-mid' })
  })

  it('skips docs without publishedAt and returns [] when nothing published', async () => {
    const payload = fakePayload({
      posts: [{ slug: 'draftish', title: 'draftish', publishedAt: '' }],
    })
    expect(await getBuildLogEntries(payload, 'pl')).toEqual([])
  })
})

describe('getPlatformStats', () => {
  it('returns published counts and newest publishedAt across posts+projects', async () => {
    const payload = fakePayload({
      posts: [post('a', '2026-06-10')],
      projects: [post('b', '2026-07-02')],
    })
    const stats = await getPlatformStats(payload, 'pl')
    expect(stats.projectsLive).toBe(1)
    expect(stats.programsLive).toBe(3)
    expect(stats.lastShippedAt).toBe('2026-07-02')
  })

  it('returns null lastShippedAt when nothing is published', async () => {
    const stats = await getPlatformStats(fakePayload(), 'pl')
    expect(stats.lastShippedAt).toBeNull()
  })
})

describe('getCurrentlyBuilding', () => {
  it('returns the first in_progress roadmap item title', async () => {
    const payload = fakePayload({
      roadmapItems: [
        { title: 'done thing', status: 'done' },
        { title: 'wip thing', status: 'in_progress' },
      ],
    })
    expect(await getCurrentlyBuilding(payload, 'pl')).toBe('wip thing')
  })

  it('returns null when nothing is in progress', async () => {
    expect(await getCurrentlyBuilding(fakePayload(), 'pl')).toBeNull()
  })
})
