import { describe, it, expect } from 'vitest'
import { LEGAL_CONTENT, LEGAL_TITLES } from './content'

// Parity guard for the legal docs: PL and EN must stay structurally aligned so a
// newsletter/marketing clause (or any future clause) can never land in one locale
// only. We assert (a) every doc has both locales non-empty, (b) the two locales
// have the same number of markdown headings (## sections), and (c) the
// double-opt-in newsletter clause added for the lead-capture feature exists in
// BOTH locales.

const DOCS = Object.keys(LEGAL_CONTENT) as Array<keyof typeof LEGAL_CONTENT>

function headingCount(md: string): number {
  return md.split('\n').filter((l) => /^#{1,3}\s/.test(l)).length
}

describe('legal content parity (pl/en)', () => {
  it('every doc has non-empty pl and en', () => {
    for (const doc of DOCS) {
      expect(LEGAL_CONTENT[doc].pl.length, `${doc}.pl empty`).toBeGreaterThan(0)
      expect(LEGAL_CONTENT[doc].en.length, `${doc}.en empty`).toBeGreaterThan(0)
      expect(LEGAL_TITLES[doc].pl).toBeTruthy()
      expect(LEGAL_TITLES[doc].en).toBeTruthy()
    }
  })

  it('pl and en have the same number of headings per doc', () => {
    for (const doc of DOCS) {
      expect(
        headingCount(LEGAL_CONTENT[doc].en),
        `${doc}: heading count differs between pl and en`,
      ).toBe(headingCount(LEGAL_CONTENT[doc].pl))
    }
  })

  it('the newsletter double-opt-in clause is present in BOTH locales of the privacy policy', () => {
    const pl = LEGAL_CONTENT['polityka-prywatnosci'].pl
    const en = LEGAL_CONTENT['polityka-prywatnosci'].en
    // PL clause
    expect(pl).toContain('double opt-in')
    expect(pl).toContain('Brevo')
    expect(pl.toLowerCase()).toContain('newsletter')
    expect(pl).toContain('lead-magnet')
    expect(pl).toContain('wypisz') // unsubscribe right
    // EN clause
    expect(en).toContain('double opt-in')
    expect(en).toContain('Brevo')
    expect(en.toLowerCase()).toContain('newsletter')
    expect(en).toContain('lead-magnet')
    expect(en).toContain('unsubscribe') // unsubscribe right
  })

  it('terms carry the 2026-09 licence/B2B/Discord sections in BOTH locales, without tier packages', () => {
    const pl = LEGAL_CONTENT.regulamin.pl
    const en = LEGAL_CONTENT.regulamin.en
    expect(pl).toContain('bezterminowej licencji')
    expect(pl).toContain('art. 68')
    expect(pl).toContain('art. 75 ust. 2 i 3')
    expect(pl).toContain('czynnym podatnikiem VAT')
    expect(pl).toContain('Bartłomiej Filipiuk Devins')
    expect(pl).toContain('Devince')
    expect(en).toContain('perpetual licence')
    expect(en).toContain('Art. 68')
    expect(en).toContain('Art. 75(2) and (3)')
    expect(en).toContain('active VAT payer')
    for (const md of [pl, en]) {
      expect(md).toMatch(/§12\./)
      expect(md).toMatch(/§13\. (Zasady korzystania z Discorda|Discord rules)/)
      // packages were taken off sale — the licence is one, tier-free
      expect(md).not.toMatch(/\b(Pro|Agency)\b/)
      expect(md).not.toMatch(/idea-to-mvp|Course Platform Starter/i)
    }
    // No forum clause for consumers: the seller-seat court appears only in §12 (B2B).
    const plForum = pl.indexOf('sąd właściwy dla siedziby Sprzedawcy')
    expect(plForum).toBeGreaterThan(pl.indexOf('## §12.'))
    expect(plForum).toBeLessThan(pl.indexOf('## §13.'))
  })

  it('privacy policy no longer says Discord notifications carry the buyer e-mail', () => {
    const pl = LEGAL_CONTENT['polityka-prywatnosci'].pl
    const en = LEGAL_CONTENT['polityka-prywatnosci'].en
    expect(pl).toContain('bez adresu e-mail')
    expect(en).toContain('no buyer e-mail address')
    expect(pl).not.toContain('zawierające adres e-mail kupującego')
    expect(en).not.toContain("containing the buyer's e-mail")
    for (const md of [pl, en]) {
      expect(md).toContain('Scanye')
      expect(md).toContain('12')
      expect(md).toContain('YouTube')
    }
  })
})
