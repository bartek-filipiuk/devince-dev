import React from 'react'
import type { Metadata } from 'next'

import { getLocaleFromParams } from '@/utilities/getLocale'
import { LEGAL_TITLES } from '@/legal/content'
import { LegalPage } from '@/legal/LegalPage'

// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { locale: localeParam } = await paramsPromise
  const locale = getLocaleFromParams(localeParam)
  return {
    title: LEGAL_TITLES.regulamin[locale],
  }
}

export default async function RegulaminPage({ params: paramsPromise }: Args) {
  const { locale: localeParam } = await paramsPromise
  const locale = getLocaleFromParams(localeParam)
  return <LegalPage doc="regulamin" locale={locale} />
}
