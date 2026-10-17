import { describe, it, expect } from 'vitest'
import redirects from '../../redirects.js'

describe('legacy /privacy redirects', () => {
  it('301s /privacy and /en/privacy to the code-owned privacy policy', async () => {
    const list = (await redirects()) as Array<{
      source: string
      destination: string
      statusCode?: number
    }>
    const bySource = Object.fromEntries(list.map((r) => [r.source, r]))
    expect(bySource['/privacy']).toMatchObject({
      destination: '/polityka-prywatnosci',
      statusCode: 301,
    })
    expect(bySource['/en/privacy']).toMatchObject({
      destination: '/en/polityka-prywatnosci',
      statusCode: 301,
    })
  })
})

describe('/f/:slug package redirect', () => {
  it('302s to the apps-store product on a fixed host, slug restricted to [a-z0-9-]', async () => {
    const list = (await redirects()) as Array<{
      source: string
      destination: string
      statusCode?: number
    }>
    const r = list.find((x) => x.source.startsWith('/f/'))
    expect(r).toEqual({
      source: '/f/:slug([a-z0-9-]+)',
      destination: 'https://apps.devince.dev/:slug',
      statusCode: 302,
    })
  })
})
