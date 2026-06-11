/**
 * Formats a price given in cents to a human-readable string using pl-PL locale.
 *
 * Examples:
 *   formatPrice(4900, 'pln') → '49,00 zł'
 *   formatPrice(1200, 'eur') → '12,00 €'
 *   formatPrice(500, 'usd')  → '5,00 USD'
 */
export function formatPrice(priceCents: number, currency: 'pln' | 'eur' | 'usd'): string {
  const amount = priceCents / 100

  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}
