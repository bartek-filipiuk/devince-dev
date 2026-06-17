/**
 * Formats a price given in cents to a human-readable, currency-appropriate string.
 *
 * The locale is chosen per currency so the symbol and number format match buyer
 * expectations:
 *   formatPrice(4900, 'pln') → '49,00 zł'   (pl-PL)
 *   formatPrice(4900, 'usd') → '$49.00'     (en-US)
 *   formatPrice(1200, 'eur') → '€12.00'     (en-IE)
 */
const LOCALE_BY_CURRENCY: Record<'pln' | 'eur' | 'usd', string> = {
  pln: 'pl-PL',
  eur: 'en-IE',
  usd: 'en-US',
}

export function formatPrice(priceCents: number, currency: 'pln' | 'eur' | 'usd'): string {
  const amount = priceCents / 100

  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency] ?? 'pl-PL', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}
