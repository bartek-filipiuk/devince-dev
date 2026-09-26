import { describe, it, expect } from 'vitest'
import { checkoutConsentKey, checkoutConsentLinks } from './consentKey'

describe('checkout consent links', () => {
  it('workshop (terms-only) links the general terms, privacy and the stronaw5dni workshop terms', () => {
    const links = checkoutConsentLinks(
      { slug: 'od-localhosta-do-produkcji', checkoutConsentMode: 'terms-only' },
      'pl',
    )
    expect(links.map((l) => l.href)).toEqual([
      'https://devince.dev/regulamin',
      'https://devince.dev/polityka-prywatnosci',
      'https://stronaw5dni.pl/regulamin.html#warsztat',
    ])
    expect(checkoutConsentKey({ checkoutConsentMode: 'terms-only' })).toBe(
      'courses.checkout.consentTerms',
    )
  })

  it('EN uses the /en legal pages', () => {
    const links = checkoutConsentLinks(
      { slug: 'od-localhosta-do-produkcji', checkoutConsentMode: 'terms-only' },
      'en',
    )
    expect(links[0].href).toBe('https://devince.dev/en/regulamin')
    expect(links[2].label).toBe('Workshop terms')
  })

  it('other terms-only programs get only the general documents', () => {
    const links = checkoutConsentLinks({ slug: 'x', checkoutConsentMode: 'terms-only' }, 'pl')
    expect(links).toHaveLength(2)
  })

  it('digital-content (Art. 38) consent stays link-free', () => {
    expect(checkoutConsentLinks({ slug: 'od-localhosta-do-produkcji' }, 'pl')).toEqual([])
  })
})
