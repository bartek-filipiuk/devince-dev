'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useState } from 'react'

/**
 * Open-redirect guard: only allow a same-origin RELATIVE path.
 * Accept values that start with a single "/" and are NOT "//..." (protocol-
 * relative) and do NOT contain a scheme (e.g. "/\\evil.com", "javascript:").
 * Anything else (absolute URLs, protocol-relative, backslash tricks) -> fallback.
 */
function safeNext(next: string | null, fallback: string): string {
  if (!next) return fallback
  // Must begin with exactly one slash (relative, same-origin path).
  if (!next.startsWith('/') || next.startsWith('//')) return fallback
  // Reject backslashes (browsers treat "/\" like "//" -> protocol-relative).
  if (next.includes('\\')) return fallback
  // Reject whitespace and any C0 control characters that could smuggle a scheme.
  if (/\s/.test(next)) return fallback
  for (let i = 0; i < next.length; i++) {
    if (next.charCodeAt(i) < 0x20) return fallback
  }
  // Reject a leading scheme even after the slash (defense in depth).
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(next)) return fallback
  return next
}

type Labels = {
  email: string
  password: string
  submit: string
  submitting: string
  forgot: string
  invalidCredentials: string
}

export function LoginForm({
  defaultNext,
  forgotHref,
  labels,
}: {
  defaultNext: string
  forgotHref: string
  labels: Labels
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get('next'), defaultNext)

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
        setError(labels.invalidCredentials)
        setLoading(false)
        return
      }

      router.push(next)
    } catch {
      setError(labels.invalidCredentials)
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label className="auth-label" htmlFor="email">
          {labels.email}
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
          {labels.password}
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
        {loading ? labels.submitting : labels.submit}
      </button>

      <p className="auth-links">
        <Link href={forgotHref}>{labels.forgot}</Link>
      </p>
    </form>
  )
}
