import type { Locale } from '@/i18n'
import type { Changelog } from '@/payload-types'

export type ChangelogEntry = NonNullable<Changelog['entries']>[number]

const LOCALE_TAG: Record<Locale, string> = { pl: 'pl-PL', en: 'en-US' }

/** Human date header for an entry; falls back to the raw value if unparseable. */
export function formatChangelogDate(date: string, locale: Locale): string {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString(LOCALE_TAG[locale], { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Newest entry first (display order), without mutating the input. */
export function sortEntriesDesc(entries: ChangelogEntry[]): ChangelogEntry[] {
  return [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
