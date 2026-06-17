import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'

/**
 * Top navigation for the isolated courses subdomain. Mirrors the handoff
 * Sylabus.html nav markup (.nav / .brand / four-dot .mark / .nav__links /
 * .nav__spacer / .nav__actions) using the course theme classes.
 */
export function CoursesNav() {
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
          Devince <span>· kursy</span>
        </b>
      </Link>
      <div className="nav__links">
        <Link href="/">Kursy</Link>
        <Link href="/account">Konto</Link>
      </div>
      <div className="nav__spacer" />
      <div className="nav__actions">
        <ThemeToggle />
        <Link className="btn btn--primary" href="/">
          <span>Zacznij kurs</span>
          <span className="icon" data-i="arrow" aria-hidden="true" />
        </Link>
      </div>
    </nav>
  )
}
