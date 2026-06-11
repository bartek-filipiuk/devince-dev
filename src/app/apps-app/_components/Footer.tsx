/**
 * Footer for the isolated apps subdomain. Mirrors the Sylabus-derived
 * footer (.foot > .shell) from courses-app.
 */
export function AppsFooter() {
  return (
    <footer className="foot">
      <div className="shell">
        <span>
          <a href="https://devince.dev">devince.dev</a>
          {' '}— aplikacje i pliki do pobrania
        </span>
        <span className="mono">© {new Date().getFullYear()} Devince</span>
      </div>
    </footer>
  )
}
