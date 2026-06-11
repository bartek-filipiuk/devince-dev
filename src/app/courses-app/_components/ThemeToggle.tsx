'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'course:theme'

/**
 * Toggles the `light` class on <html> for the isolated courses theme and
 * persists the choice in localStorage. The no-FOUC inline script in
 * layout.tsx applies the stored value before paint; this component only
 * keeps the button label in sync and handles clicks.
 */
export function ThemeToggle() {
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains('light'))
  }, [])

  const toggle = () => {
    const next = !document.documentElement.classList.contains('light')
    document.documentElement.classList.toggle('light', next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? 'light' : 'dark')
    } catch {
      /* ignore storage failures (private mode etc.) */
    }
    setIsLight(next)
  }

  return (
    <button
      className="btn btn--ghost"
      type="button"
      onClick={toggle}
      aria-pressed={isLight}
      suppressHydrationWarning
    >
      <span className="icon" data-i="theme" aria-hidden="true" />
      <span className="btn__label" suppressHydrationWarning>
        {isLight ? 'Ciemny' : 'Jasny'}
      </span>
    </button>
  )
}
