import type { Locale } from '@/i18n'
import { getLocalizedPath } from '@/utilities/getLocale'

/**
 * Which consent the paid-checkout checkbox collects for a program.
 * 'terms-only' (reservation-style purchase, nothing delivered on payment) →
 * plain terms acceptance; default → Art. 38 pkt 13 withdrawal waiver.
 * Single source for every CourseCheckoutButton call site (SyllabusHero,
 * CtaBand, CourseCard) — the key choice must never fork per component.
 */
export function checkoutConsentKey(program: {
  checkoutConsentMode?: string | null
}): 'courses.checkout.consentTerms' | 'courses.checkout.consent' {
  return program.checkoutConsentMode === 'terms-only'
    ? 'courses.checkout.consentTerms'
    : 'courses.checkout.consent'
}

/**
 * Programs sold under an additional, product-specific set of terms (the live
 * workshop is sold on stronaw5dni.pl terms, section "Warsztat"). Keyed by slug
 * because it is content-in-code (no schema/migration for a single program).
 */
const EXTRA_TERMS_BY_SLUG: Record<string, { pl: string; en: string; href: string }> = {
  'od-localhosta-do-produkcji': {
    pl: 'Regulamin warsztatu',
    en: 'Workshop terms',
    href: 'https://stronaw5dni.pl/regulamin.html#warsztat',
  },
}

export type ConsentLink = { href: string; label: string }

/**
 * Links rendered inside the 'terms-only' consent label, so the buyer can open
 * exactly the documents they accept: the general devince Terms, the Privacy
 * Policy and — for the workshop — its own terms. The legal pages live only on
 * the main host, hence absolute https://devince.dev URLs (like CoursesFooter).
 * The Art. 38 (digital-content) label stays link-free (unchanged).
 */
export function checkoutConsentLinks(
  program: { slug?: string | null; checkoutConsentMode?: string | null },
  locale: Locale,
): ConsentLink[] {
  if (program.checkoutConsentMode !== 'terms-only') return []
  const links: ConsentLink[] = [
    {
      href: `https://devince.dev${getLocalizedPath('/regulamin', locale)}`,
      label: locale === 'en' ? 'Terms of Service' : 'Regulamin',
    },
    {
      href: `https://devince.dev${getLocalizedPath('/polityka-prywatnosci', locale)}`,
      label: locale === 'en' ? 'Privacy Policy' : 'Polityka Prywatności',
    },
  ]
  const extra = program.slug ? EXTRA_TERMS_BY_SLUG[program.slug] : undefined
  if (extra) links.push({ href: extra.href, label: extra[locale] })
  return links
}
