import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { getLocale } from '@/utilities/getLocale.server'
import { t } from '@/i18n'

import './course-theme.css'
import { UmamiScript } from '@/components/UmamiScript'
import { CoursesNav } from './_components/Nav'
import { CoursesFooter } from './_components/Footer'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  return {
    title: t(locale, 'courses.meta.title'),
    description: t(locale, 'courses.meta.description'),
  }
}

// No-FOUC: read the persisted theme and apply the `light` class before paint.
// Runs in <head> so the correct theme is set before the body renders.
const NO_FOUC = `(function(){try{var t=localStorage.getItem('course:theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();`

/**
 * Isolated ROOT layout for the courses subdomain. Because this repo has no
 * top-level app/layout.tsx (roots live per route tree), this <html> wrapper
 * is the root layout for every /courses-app/* route — fully isolated from
 * the main site's (frontend) layout and theme.
 */
export default async function CoursesRootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FOUC }} />
        <UmamiScript />
      </head>
      <body>
        {/* NDQS "Cyber Gold" ambience — fixed, behind everything (dark only;
            hidden in light mode via CSS). Pure decoration, aria-hidden. */}
        <div className="aurora-bg" aria-hidden="true">
          <div className="aurora-orb purple" />
          <div className="aurora-orb gold" />
          <div className="aurora-orb blue" />
        </div>
        <div className="noise-overlay" aria-hidden="true" />
        <a className="skip-link" href="#main">
          {t(locale, 'courses.skip')}
        </a>
        <CoursesNav locale={locale} />
        <main id="main">{children}</main>
        <CoursesFooter locale={locale} />
      </body>
    </html>
  )
}
