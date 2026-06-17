import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './course-theme.css'
import { CoursesNav } from './_components/Nav'
import { CoursesFooter } from './_components/Footer'

export const metadata: Metadata = {
  title: 'Devince · kursy',
  description: 'Kursy budowane na żywo z Claude Code.',
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
export default function CoursesRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FOUC }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Przejdź do treści
        </a>
        <CoursesNav />
        <main id="main">{children}</main>
        <CoursesFooter />
      </body>
    </html>
  )
}
