import type { Metadata } from 'next'

import { getLocale } from '@/utilities/getLocale.server'
import { t } from '@/i18n'
import { ClaimConfirmed } from '../../../_shared/ClaimConfirmed'

// The grant mutates the DB; this page must never be statically cached.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return { title: t(locale, 'claim.meta'), robots: { index: false, follow: false } }
}

export default async function CoursesClaimConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ grant?: string | string[] }>
}) {
  const sp = await searchParams
  const grant = Array.isArray(sp.grant) ? sp.grant[0] : sp.grant
  const locale = await getLocale()
  return <ClaimConfirmed grant={grant} locale={locale} />
}
