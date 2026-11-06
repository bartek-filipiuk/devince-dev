import { describe, it, expect } from 'vitest'
import { Pages } from '@/collections/Pages'
import { Posts } from '@/collections/Posts'
import { Projects } from '@/collections/Projects'
import { Media } from '@/collections/Media'
import { Categories } from '@/collections/Categories'
import { Header } from '@/Header/config'
import { Footer } from '@/Footer/config'
import { SiteSettings } from '@/SiteSettings/config'
import { Roadmap } from '@/Roadmap/config'

// Customers have accounts (courses store). Marketing content, media and globals are admin-only to write,
// otherwise any buyer can deface pages or upload an SVG served same-origin as /admin.
const customer = { req: { user: { roles: ['customer'] } } } as any
const admin = { req: { user: { roles: ['admin'] } } } as any

const collections = { Pages, Posts, Projects, Media, Categories }
const globals = { Header, Footer, SiteSettings, Roadmap }

describe('content write access', () => {
  for (const [name, c] of Object.entries(collections)) {
    for (const op of ['create', 'update', 'delete'] as const) {
      it(`${name}.${op}: customer denied, admin allowed`, async () => {
        const fn = (c.access as any)?.[op]
        expect(typeof fn).toBe('function')
        expect(await fn(customer)).toBe(false)
        expect(await fn(admin)).toBe(true)
      })
    }
  }
  for (const [name, g] of Object.entries(globals)) {
    it(`${name}.update: customer denied, admin allowed`, async () => {
      const fn = (g.access as any)?.update
      expect(typeof fn).toBe('function')
      expect(await fn(customer)).toBe(false)
      expect(await fn(admin)).toBe(true)
    })
  }
  for (const [name, c] of Object.entries({ Pages, Posts, Projects })) {
    it(`${name}.read: customer sees published only`, async () => {
      expect(await (c.access as any).read(customer)).toEqual({ _status: { equals: 'published' } })
    })
  }
})
