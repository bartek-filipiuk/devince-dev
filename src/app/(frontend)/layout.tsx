import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import React from 'react'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode, headers } from 'next/headers'
import { defaultLocale, isValidLocale, type Locale } from '@/i18n'

import './globals.css'
import './theme.css'
import { getServerSideURL } from '@/utilities/getURL'

async function getLocale(): Promise<Locale> {
  const headersList = await headers()

  // First try to get locale from middleware header
  const localeHeader = headersList.get('x-locale')
  if (localeHeader && isValidLocale(localeHeader)) {
    return localeHeader as Locale
  }

  // Fallback: check pathname
  const pathname = headersList.get('x-pathname') || ''
  const segments = pathname.split('/').filter(Boolean)
  const firstSegment = segments[0]

  if (firstSegment && isValidLocale(firstSegment)) {
    return firstSegment as Locale
  }

  return defaultLocale
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()
  const locale = await getLocale()

  return (
    <html className={cn(spaceGrotesk.variable, jetbrainsMono.variable)} lang={locale} suppressHydrationWarning>
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <Providers locale={locale}>
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />

          <Header />
          <main className="pt-16">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: '@payloadcms',
  },
}
