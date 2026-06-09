/**
 * Strip the default-locale prefix from a pathname and normalise the result to a
 * single leading slash.
 *
 * SECURITY: the previous implementation did `pathname.replace('/pl','')` and fed
 * the result straight into `new URL(stripped, request.url)`. A crafted path like
 * `/pl//evil.com` produced `//evil.com`, which `new URL` resolves as a
 * protocol-relative URL to an EXTERNAL origin → open redirect. Collapsing leading
 * slashes/backslashes guarantees the result is always a same-origin relative path.
 */
export function stripDefaultLocalePrefix(pathname: string, defaultLocale: string): string {
  const prefix = `/${defaultLocale}`
  const rest =
    pathname === prefix
      ? ''
      : pathname.startsWith(`${prefix}/`)
        ? pathname.slice(prefix.length)
        : pathname
  // Collapse any leading "/" or "\" run to a single "/" so the path can never be
  // protocol-relative (//host) or backslash-escaped (/\host).
  return '/' + rest.replace(/^[/\\]+/, '')
}
