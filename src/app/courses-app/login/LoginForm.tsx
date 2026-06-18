'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useState } from 'react'
import { safeNext } from '@/utilities/safeNext'

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
