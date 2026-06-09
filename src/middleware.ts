import { NextRequest, NextResponse } from 'next/server'
import { defaultLocale, isValidLocale } from './i18n/config'
import { stripDefaultLocalePrefix } from './utilities/localeRedirect'

const PUBLIC_FILE = /\.(.*)$/
const EXCLUDED_PREFIXES = ['/admin', '/api', '/_next', '/next', '/favicon', '/robots.txt', '/sitemap']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
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
