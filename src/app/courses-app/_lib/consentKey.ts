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
