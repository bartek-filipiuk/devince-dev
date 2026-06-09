import Link from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/button'
import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { t } from '@/i18n'

export default async function NotFound() {
  const locale = await getLocale()

  return (
    <div className="container py-28">
      <div className="prose max-w-none">
        <h1 style={{ marginBottom: 0 }}>404</h1>
        <p className="mb-4">{t(locale, 'notFound.message')}</p>
      </div>
      <Button asChild variant="default">
        <Link href={getLocalizedPath('/', locale)}>{t(locale, 'notFound.goHome')}</Link>
      </Button>
    </div>
  )
}
