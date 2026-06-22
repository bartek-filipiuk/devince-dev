import type { Metadata } from 'next'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { getLocale } from '@/utilities/getLocale.server'
import { t } from '@/i18n'
import { RoadmapView } from '@/components/Roadmap/RoadmapView'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return { title: t(locale, 'roadmap.meta') }
}

export default async function AppsRoadmapPage() {
  const locale = await getLocale()
  const payload = await getPayload({ config: configPromise })
  const roadmap = await payload.findGlobal({ slug: 'roadmap', locale, depth: 0 })
  const items = Array.isArray(roadmap.items) ? roadmap.items : []
  return <RoadmapView items={items} locale={locale} />
}
