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

  const redirects = [internetExplorerRedirect, ...privacyRedirects]

  return redirects
}

export default redirects
