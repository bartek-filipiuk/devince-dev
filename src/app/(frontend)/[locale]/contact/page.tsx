import React from 'react'
import type { Metadata } from 'next'

// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic'
import { getCachedGlobal } from '@/utilities/getGlobals'
import type { SiteSetting } from '@/payload-types'
import { ContactInfo } from '@/components/ContactInfo'
import { SocialLinks } from '@/components/SocialLinks'
import { getLocaleFromParams } from '@/utilities/getLocale'
import { t } from '@/i18n'

type Args = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { locale: localeParam } = await paramsPromise
  const locale = getLocaleFromParams(localeParam)
  return {
    title: t(locale, 'contact.metaTitle'),
    description: t(locale, 'contact.metaDescription'),
  }
}

export default async function ContactPage({ params: paramsPromise }: Args) {
  const { locale: localeParam } = await paramsPromise
  const locale = getLocaleFromParams(localeParam)
  const siteSettings = (await getCachedGlobal('site-settings', locale, 1)()) as SiteSetting

  return (
    <div className="container py-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">{t(locale, 'contact.pageTitle')}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">{t(locale, 'contact.getInTouch')}</h2>
            {siteSettings?.contact ? (
              <ContactInfo contact={siteSettings.contact} detailed locale={locale} />
            ) : (
              <p className="text-muted-foreground">{t(locale, 'contact.notConfigured')}</p>
            )}
          </div>

          {/* Additional Info / Map Placeholder */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">{t(locale, 'contact.findUs')}</h2>
            <div className="bg-muted rounded-lg p-8 text-center">
              <p className="text-muted-foreground">{t(locale, 'contact.mapPlaceholder')}</p>
            </div>
          </div>
        </div>

        {/* Social Links */}
        {siteSettings?.socialLinks && siteSettings.socialLinks.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-semibold mb-6">{t(locale, 'contact.followUs')}</h2>
            <SocialLinks links={siteSettings.socialLinks} size="large" />
          </div>
        )}
      </div>
    </div>
  )
}
