import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/utilities/getGlobals'
import React from 'react'

import type { Header } from '@/payload-types'
import { defaultLocale, type Locale } from '@/i18n'

export async function Header({ locale = defaultLocale }: { locale?: Locale }) {
  const headerData = (await getCachedGlobal('header', locale, 1)()) as Header

  return <HeaderClient data={headerData} />
}
