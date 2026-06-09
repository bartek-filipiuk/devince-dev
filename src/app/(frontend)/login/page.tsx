'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useState } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next')

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

      router.push(next ?? '/account')
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

      <button className="auth-submit" type="submit" disabled={loading}>
        {loading ? 'Logowanie...' : 'Zaloguj się'}
      </button>

      <p className="auth-links">
        <Link href="/forgot-password">Nie pamiętasz hasła?</Link>
      </p>
    </form>
  )
}

export default function LoginPage() {
  return (
    <section className="auth container py-20">
      <div className="max-w-md mx-auto">
        <h1 className="auth-title text-3xl font-bold mb-8">Zaloguj się</h1>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  )
}
