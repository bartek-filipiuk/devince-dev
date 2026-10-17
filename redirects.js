const redirects = async () => {
  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header',
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  // Legacy /privacy (seeded CMS page "Strona w przygotowaniu") → the real,
  // code-owned privacy policy. 301 (not Next's default 308) so crawlers and old
  // links treat it as a classic permanent move. /pl/privacy is normalised to
  // /privacy by the middleware first, then lands here.
  const privacyRedirects = [
    { source: '/privacy', destination: '/polityka-prywatnosci', statusCode: 301 },
    { source: '/en/privacy', destination: '/en/polityka-prywatnosci', statusCode: 301 },
  ]

  // One package page per video: devince.dev/f/<slug> → the apps-store product.
  // 302 so the target can change later without browsers caching it forever.
  // The destination host is fixed and the slug class excludes '/', '.', ':',
  // '@' and '%', so this cannot be turned into an open redirect.
  // Config redirects run before the middleware, so no locale rewrite interferes.
  const packageRedirects = [
    {
      source: '/f/:slug([a-z0-9-]+)',
      destination: 'https://apps.devince.dev/:slug',
      statusCode: 302,
    },
  ]

  const redirects = [internetExplorerRedirect, ...privacyRedirects, ...packageRedirects]

  return redirects
}

export default redirects
