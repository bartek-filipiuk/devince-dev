import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'

/**
 * Top navigation for the isolated apps subdomain. Mirrors the Sylabus-derived
 * nav markup (.nav / .brand / four-dot .mark / .nav__spacer / .nav__actions)
 * from courses-app. No login/account links — account-less downloadable store.
 */
export function AppsNav() {
  return (
    <nav className="nav">
      <Link className="brand" href="/">
        <span className="mark">
          <i />
          <i />
          <i />
          <i />
        </span>
        <b>
          Devince <span>· apps</span>
        </b>
      </Link>
      <div className="nav__spacer" />
      <div className="nav__actions">
        <ThemeToggle />
      </div>
    </nav>
  )
}
