import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale, isValidLocale } from './i18n/config'

// Paths that should not be localized
const PUBLIC_FILE = /\.(.*)$/
const EXCLUDED_PATHS = [
  '/admin',
  '/api',
  '/_next',
  '/next',
  '/favicon',
  '/robots.txt',
  '/sitemap.xml',
]

function getLocaleFromPath(pathname: string): string | null {
  const segments = pathname.split('/')
  const firstSegment = segments[1]

  if (firstSegment && isValidLocale(firstSegment)) {
    return firstSegment
  }

  return null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip excluded paths
  if (
    EXCLUDED_PATHS.some((path) => pathname.startsWith(path)) ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  const pathLocale = getLocaleFromPath(pathname)

  // If the path already has a locale prefix
  if (pathLocale) {
    // If it's the default locale with prefix, redirect to remove prefix
    // e.g., /pl/about -> /about
    if (pathLocale === defaultLocale) {
      const newPathname = pathname.replace(`/${defaultLocale}`, '') || '/'
      return NextResponse.redirect(new URL(newPathname, request.url))
    }

    // Non-default locale, set header and continue
    const response = NextResponse.next()
    response.headers.set('x-locale', pathLocale)
    response.headers.set('x-pathname', pathname)
    return response
  }

  // No locale in path - this is for the default locale (pl)
  const response = NextResponse.next()
  response.headers.set('x-locale', defaultLocale)
  response.headers.set('x-pathname', pathname)
  return response
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    '/((?!_next|admin|api|favicon|robots.txt|sitemap.xml).*)',
  ],
}
