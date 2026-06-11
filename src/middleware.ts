import { NextRequest, NextResponse } from 'next/server'
import { defaultLocale, isValidLocale } from './i18n/config'
import { stripDefaultLocalePrefix } from './utilities/localeRedirect'

const PUBLIC_FILE = /\.(.*)$/
const EXCLUDED_PREFIXES = [
  '/admin',
  '/api',
  '/_next',
  '/next',
  '/favicon',
  '/robots.txt',
  '/sitemap',
  // Courses subdomain renders an isolated, locale-neutral (PL-only) route
  // tree at /courses-app. It must NEVER be touched by the [locale] rewrite.
  '/courses-app',
  // Course-platform routes are locale-neutral and live OUTSIDE the [locale]
  // segment. They must NOT be rewritten into /[locale]/... (that 404s).
  '/learn',
  '/login',
  '/account',
  '/set-password',
  '/forgot-password',
]

// Locale-neutral course-platform page paths that, on the courses subdomain, must
// rewrite into the isolated /courses-app tree (so they render the course-themed
// pages, not the main (frontend) ones). Truly-shared infra (/api, /_next, /admin,
// /next preview, sitemaps) is intentionally NOT here — it stays shared.
const COURSE_PAGE_PREFIXES = ['/login', '/account', '/learn', '/set-password', '/forgot-password']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p)) || PUBLIC_FILE.test(pathname)) {
    // courses.* host accessing /courses-app directly (already-rewritten path):
    // let it through. Direct access on the MAIN host is handled below.
    if (pathname.startsWith('/courses-app')) {
      const host = (request.headers.get('host') ?? '').split(':')[0]
      if (host.startsWith('courses.')) {
        return NextResponse.next()
      }
      // Block direct access on the main host -> bounce to the courses subdomain.
      const stripped = pathname.replace(/^\/courses-app/, '') || '/'
      return NextResponse.redirect(new URL(stripped, 'https://courses.devince.dev'))
    }
    // On the courses subdomain, the locale-neutral course PAGE paths must rewrite
    // into the isolated /courses-app tree so they render the course-themed pages
    // (not the main (frontend) versions). On the main host they pass through.
    const host = (request.headers.get('host') ?? '').split(':')[0]
    if (host.startsWith('courses.') && COURSE_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) {
      const url = request.nextUrl.clone()
      url.pathname = `/courses-app${pathname}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  // Host-based isolation for the courses subdomain. courses.* renders a
  // dedicated, locale-neutral design rewritten into the real /courses-app
  // segment. This MUST run before the [locale] logic so it bypasses it.
  const host = (request.headers.get('host') ?? '').split(':')[0]
  const isCourses = host.startsWith('courses.')
  if (isCourses) {
    if (!pathname.startsWith('/courses-app')) {
      const url = request.nextUrl.clone()
      url.pathname = `/courses-app${pathname === '/' ? '' : pathname}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  const seg = pathname.split('/')[1] ?? ''
  // /pl/... -> redirect to canonical prefix-less.
  // Use nextUrl.clone() + a normalised same-origin pathname so a crafted
  // `/pl//evil.com` cannot open-redirect to an external origin.
  if (seg === defaultLocale) {
    const url = request.nextUrl.clone()
    url.pathname = stripDefaultLocalePrefix(pathname, defaultLocale)
    return NextResponse.redirect(url)
  }
  // /en/... -> pass through to [locale]=en
  if (isValidLocale(seg)) {
    const res = NextResponse.next()
    res.headers.set('x-locale', seg)
    res.headers.set('x-pathname', pathname)
    return res
  }
  // no locale prefix -> default locale: rewrite into [locale], keep URL
  const url = request.nextUrl.clone()
  url.pathname = `/${defaultLocale}${pathname}`
  const res = NextResponse.rewrite(url)
  res.headers.set('x-locale', defaultLocale)
  res.headers.set('x-pathname', pathname)
  return res
}

export const config = {
  matcher: ['/((?!_next|admin|api|favicon|robots.txt|sitemap).*)'],
}
