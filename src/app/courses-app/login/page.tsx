'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useState } from 'react'

/**
 * Course-themed login for courses.devince.dev. Behaviour mirrors the main-site
 * `(frontend)/login` page (Payload native login via POST /api/users/login with
 * a same-origin `next` redirect guard), restyled with the course design system
 * (`.shell`, `.btn`, surfaces, `.eyebrow`/`.section-title`, `.auth-*`).
 *
 * Host-rewrite: on courses.devince.dev this renders at `/login`.
 */

/**
 * Open-redirect guard: only allow a same-origin RELATIVE path.
 * Accept values that start with a single "/" and are NOT "//..." (protocol-
 * relative) and do NOT contain a scheme (e.g. "/\\evil.com", "javascript:").
 * Anything else (absolute URLs, protocol-relative, backslash tricks) -> /account.
 */
function safeNext(next: string | null): string {
  if (!next) return '/account'
  // Must begin with exactly one slash (relative, same-origin path).
  if (!next.startsWith('/') || next.startsWith('//')) return '/account'
  // Reject backslashes (browsers treat "/\" like "//" -> protocol-relative).
  if (next.includes('\\')) return '/account'
  // Reject whitespace and any C0 control characters that could smuggle a scheme.
  if (/\s/.test(next)) return '/account'
  for (let i = 0; i < next.length; i++) {
    if (next.charCodeAt(i) < 0x20) return '/account'
  }
  // Reject a leading scheme even after the slash (defense in depth).
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(next)) return '/account'
  return next
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        setError('Nieprawidłowy email lub hasło.')
        setLoading(false)
        return
      }

      router.push(next)
    } catch {
      setError('Nieprawidłowy email lub hasło.')
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label className="auth-label" htmlFor="email">
          Email
        </label>
        <input
          className="auth-input"
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="auth-field">
        <label className="auth-label" htmlFor="password">
          Hasło
        </label>
        <input
          className="auth-input"
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <button className="btn btn--primary btn--lg auth-submit" type="submit" disabled={loading}>
        {loading ? 'Logowanie…' : 'Zaloguj się'}
      </button>

      <p className="auth-links">
        <Link href="/forgot-password">Nie pamiętasz hasła?</Link>
      </p>
    </form>
  )
}

export default function CoursesLoginPage() {
  return (
    <section className="shell auth-shell">
      <div className="auth-card">
        <header className="auth-head">
          <span className="eyebrow">
            <i>Konto</i>
          </span>
          <h1 className="section-title">Zaloguj się</h1>
        </header>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  )
}
