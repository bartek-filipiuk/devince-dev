'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useState } from 'react'

function SetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div className="auth-form">
        <p className="auth-error" role="alert">
          Nieprawidłowy lub brakujący link aktywacyjny.
        </p>
        <p className="auth-links">
          <Link href="/forgot-password">Wyślij nowy link</Link>
        </p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Hasła nie są identyczne.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      if (!res.ok) {
        setError('Link aktywacyjny wygasł lub jest nieprawidłowy.')
        setLoading(false)
        return
      }

      router.push('/account')
    } catch {
      setError('Coś poszło nie tak. Spróbuj ponownie.')
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label className="auth-label" htmlFor="password">
          Hasło
        </label>
        <input
          className="auth-input"
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="auth-field">
        <label className="auth-label" htmlFor="confirm">
          Powtórz hasło
        </label>
        <input
          className="auth-input"
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <button className="auth-submit" type="submit" disabled={loading}>
        {loading ? 'Aktywowanie...' : 'Aktywuj konto'}
      </button>

      <p className="auth-links">
        <Link href="/forgot-password">Nie pamiętasz hasła?</Link>
      </p>
    </form>
  )
}

export default function SetPasswordPage() {
  return (
    <section className="auth container py-20">
      <div className="max-w-md mx-auto">
        <h1 className="auth-title text-3xl font-bold mb-8">Ustaw hasło</h1>
        {/* useSearchParams must be inside Suspense (Next 15 build requirement) */}
        <Suspense fallback={null}>
          <SetPasswordForm />
        </Suspense>
      </div>
    </section>
  )
}
