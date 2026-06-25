import type { Metadata } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { getLocale } from '@/utilities/getLocale.server'
import { t } from '@/i18n'
import { ChangelogView } from '@/components/Changelog/ChangelogView'
import type { ChangelogEntry } from '@/components/Changelog/groupByDate'

export const dynamic = 'force-dynamic'

// The courses storefront shows platform-wide + courses-specific + security notes.
const COURSES_TAGS = new Set(['platform', 'courses', 'security'])

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return { title: t(locale, 'changelog.meta') }
}

export default async function CoursesChangelogPage() {
  const locale = await getLocale()
  const payload = await getPayload({ config: configPromise })
  const changelog = await payload.findGlobal({ slug: 'changelog', locale, depth: 0 })
  const entries = (Array.isArray(changelog.entries) ? changelog.entries : [])
    .map((e) => ({ ...e, notes: (e.notes ?? []).filter((n) => COURSES_TAGS.has(n.tag)) }))
    .filter((e) => e.notes.length > 0) as ChangelogEntry[]
  return <ChangelogView entries={entries} locale={locale} />
}
