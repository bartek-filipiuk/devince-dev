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
