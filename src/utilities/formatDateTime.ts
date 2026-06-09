import type { Locale } from '@/i18n'

export const formatDateTime = (timestamp: string, locale: Locale = 'pl'): string => {
  const date = new Date(timestamp)
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return locale === 'pl' ? `${d}.${m}.${y}` : `${m}/${d}/${y}`
}
