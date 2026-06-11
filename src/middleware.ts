import { NextRequest, NextResponse } from 'next/server'
import { defaultLocale, isValidLocale } from './i18n/config'
import { stripDefaultLocalePrefix } from './utilities/localeRedirect'

// Matches real static file extensions (e.g. .png, .js, .css) at the END of the path.
// Intentionally EXCLUDES paths where the dot is followed by 8+ hex digits (download tokens).
// Old broad regex /\.(.*)$/ incorrectly matched token paths like /download/uuid.hex.
const PUBLIC_FILE = /\.(?![\da-f]{8,})[^./]+$/i
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
  // Apps subdomain renders an isolated, locale-neutral route tree at
  // /apps-app. It must NEVER be touched by the [locale] rewrite.
  '/apps-app',
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

  // ── Host-based subdomain routing MUST run before the PUBLIC_FILE early-exit.
  // Reason: download tokens contain a literal dot (uuid.hex) which accidentally
  // matches PUBLIC_FILE = /\.(.*)$/, causing the middleware to fall through to
  // NextResponse.next() instead of rewriting into /apps-app or /courses-app.
  const host = (request.headers.get('host') ?? '').split(':')[0]

  // --- courses.* subdomain ---
  const isCourses = host.startsWith('courses.')
  if (isCourses) {
    // Already-rewritten /courses-app path: let it through.
    if (pathname.startsWith('/courses-app')) return NextResponse.next()
    // Shared infra (/_next, /api, /admin, static files): let through unchanged.
    if (
      EXCLUDED_PREFIXES.filter((p) => !['/courses-app', '/apps-app'].includes(p)).some((p) =>
        pathname.startsWith(p),
      ) ||
      PUBLIC_FILE.test(pathname)
    ) {
      // On the courses subdomain, locale-neutral course PAGE paths must rewrite
      // into the isolated /courses-app tree (not the main (frontend) versions).
      if (COURSE_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) {
        const url = request.nextUrl.clone()
        url.pathname = `/courses-app${pathname}`
        return NextResponse.rewrite(url)
      }
      return NextResponse.next()
    }
    // All other paths on courses.*: rewrite into /courses-app.
    const url = request.nextUrl.clone()
    url.pathname = `/courses-app${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  // --- apps.* subdomain ---
  const isApps = host.startsWith('apps.')
  if (isApps) {
    // Already-rewritten /apps-app path: let it through.
    if (pathname.startsWith('/apps-app')) return NextResponse.next()
    // Shared infra (/_next, /api, /admin, static files): let through unchanged.
    if (
      EXCLUDED_PREFIXES.filter((p) => !['/courses-app', '/apps-app'].includes(p)).some((p) =>
        pathname.startsWith(p),
      ) ||
      PUBLIC_FILE.test(pathname)
    ) {
      return NextResponse.next()
    }
    // All other paths on apps.*: rewrite into /apps-app.
    const url = request.nextUrl.clone()
    url.pathname = `/apps-app${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  // --- Main host: handle /courses-app and /apps-app direct access ---
  if (pathname.startsWith('/courses-app')) {
    // Block direct access on the main host -> bounce to the courses subdomain.
    const stripped = pathname.replace(/^\/courses-app/, '') || '/'
    return NextResponse.redirect(new URL(stripped, 'https://courses.devince.dev'))
  }
  if (pathname.startsWith('/apps-app')) {
    // Block direct access on the main host -> bounce to the apps subdomain.
    const stripped = pathname.replace(/^\/apps-app/, '') || '/'
    return NextResponse.redirect(new URL(stripped, 'https://apps.devince.dev'))
  }

  // --- Main host: early-exit for static files and excluded prefixes ---
  if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p)) || PUBLIC_FILE.test(pathname)) {
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
