import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'
import { getLocaleFromParams, getLocalizedPath } from '@/utilities/getLocale'
import { t } from '@/i18n'

type Args = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { locale: localeParam } = await paramsPromise
  const locale = getLocaleFromParams(localeParam)
  return {
    title: t(locale, 'newsletter.confirmed.metaTitle'),
    description: t(locale, 'newsletter.confirmed.metaDescription'),
  }
}

export default async function NewsletterConfirmedPage({ params: paramsPromise }: Args) {
  const { locale: localeParam } = await paramsPromise
  const locale = getLocaleFromParams(localeParam)

  return (
    <div className="container py-20">
      <div className="max-w-lg mx-auto text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-4">{t(locale, 'newsletter.confirmed.title')}</h1>
        <p className="text-lg text-muted-foreground mb-8">
          {t(locale, 'newsletter.confirmed.message')}
        </p>
        <Button asChild>
          <Link href={getLocalizedPath('/', locale)}>
            {t(locale, 'newsletter.confirmed.returnHome')}
          </Link>
        </Button>
      </div>
    </div>
  )
}
