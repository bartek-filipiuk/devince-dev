import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './app-theme.css'
import { AppsNav } from './_components/Nav'
import { AppsFooter } from './_components/Footer'

export const metadata: Metadata = {
  title: {
    default: 'Devince · apps',
    template: '%s · Devince apps',
  },
  description: 'Aplikacje i pliki do pobrania — Devince.',
}

// No-FOUC: read the persisted theme and apply the `light` class before paint.
// Runs in <head> so the correct theme is set before the body renders.
const NO_FOUC = `(function(){try{var t=localStorage.getItem('apps:theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();`

/**
 * Isolated ROOT layout for the apps subdomain. Because this repo has no
 * top-level app/layout.tsx (roots live per route tree), this <html> wrapper
 * is the root layout for every /apps-app/* route — fully isolated from
 * the main site's (frontend) layout and theme.
 */
export default function AppsRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FOUC }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Przejdź do treści
        </a>
        <AppsNav />
        <main id="main">{children}</main>
        <AppsFooter />
      </body>
    </html>
  )
}
