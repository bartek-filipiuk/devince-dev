/**
 * What the buyer reads right after paying, and what the seller has to do next.
 * Every paid program gets the default (access is on, set a password, reply to
 * ask). A program whose purchase starts a SERVICE (someone acts after payment)
 * gets its own entry here, so the buyer knows at once what happens and when.
 *
 * ponytail: content-in-code keyed by program slug, like consentKey.ts. Move to
 * a Program field (admin-editable, needs a migration) once there are more than
 * a handful of entries or content changes without a deploy matter.
 * This repo is PUBLIC: no private links (sheets, edit URLs) in here.
 */

/** Lifetime of the set-password link in the access email (Users.auth.forgotPassword).
 * Long because there is no other way in: /forgot-password sends nothing (no email adapter). */
export const ACCESS_LINK_DAYS = 7

export type Onboarding = {
  subject: string
  lead: string
  /** "Co dalej": ordered steps with the deadline the buyer can hold us to. */
  steps: string[]
  /** Seller checklist, appended to the "Nowa sprzedaż" email. */
  sellerTodo: string[]
}

const BY_SLUG: Record<string, Onboarding> = {
  'audyt-z-omowieniem': {
    subject: 'Audyt z omówieniem: płatność przyjęta, co dalej',
    lead: 'Płatność za Audyt z omówieniem doszła. Dostałem powiadomienie o Twoim zamówieniu i od tej chwili pilnuję terminów.',
    steps: [
      'Dziś: ustaw hasło przyciskiem wyżej. Trafisz do programu, gdzie w lekcji Start jest formularz przygotowania (10 minut).',
      'Do 2 dni roboczych od formularza dostajesz ode mnie mailem kartę uruchomienia pod Twój stack.',
      'Odpalasz audyt u siebie i odsyłasz mi raport. Masz na to 30 dni od zakupu albo 7 dni od karty, zależnie od tego, co później.',
      'Do 3 dni roboczych od raportu dostajesz pisemne omówienie: które znaleziska są prawdziwe i w jakiej kolejności je naprawić.',
    ],
    sellerTodo: [
      'Wyślij klientowi mail z terminem karty.',
      'Dopisz wiersz w arkuszu „Klienci”.',
      'Dodaj miejsce w Sprincie: panel admina, Users, kupujący, Purchases, „Sprint bezpieczeństwa”. Klient już ma sprint? Zwróć 249 zł jako zwrot częściowy tej płatności (dostęp do audytu zostaje).',
      'Karta do 2 dni roboczych od formularza. Zwrot bez pytań: do 30 dni od zakupu, zanim przyjdzie raport, albo do 7 dni po omówieniu.',
    ],
  },
}

export function onboardingFor(slug?: string, title?: string): Onboarding {
  const own = slug ? BY_SLUG[slug] : undefined
  if (own) return own
  return {
    subject: title ? `Masz dostęp: ${title}` : 'Twój dostęp do kursu',
    lead: title
      ? `Dostęp do „${title}” jest już na Twoim koncie.`
      : 'Dostęp jest już na Twoim koncie.',
    steps: [],
    sellerTodo: [],
  }
}
