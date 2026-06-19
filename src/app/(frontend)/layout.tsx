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
import { UmamiScript } from '@/components/UmamiScript'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'
import { getLocale } from '@/utilities/getLocale.server'

import './globals.css'
import './theme.css'
import { getServerSideURL } from '@/utilities/getURL'

// Root layout for the whole (frontend) group — covers both the localized
// [locale]/* routes and the locale-neutral course routes (/login, /account,
// /learn, ...). Locale comes from the `x-locale` header set by middleware
// (defaults to the default locale when absent, e.g. on excluded course routes).
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()
  const lang = await getLocale()

  return (
    <html className={cn(spaceGrotesk.variable, jetbrainsMono.variable)} lang={lang} suppressHydrationWarning>
      <head>
        <InitTheme />
        <UmamiScript />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <Providers locale={lang}>
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />

          <Header locale={lang} />
          <main className="pt-16">{children}</main>
          <Footer locale={lang} />
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
  },
}
