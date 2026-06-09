'use client'

import Link from 'next/link'
import React, { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // NOTE: Payload triggers its reset-password flow here, but an email is only
    // actually delivered if an email adapter is configured (deferred). Regardless
    // of the result we show a neutral message to avoid user enumeration.
    try {
      await fetch('/api/users/forgot-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {
      // Intentionally swallow errors — neutral response either way.
    }

    setSubmitted(true)
    setLoading(false)
  }

  return (
    <section className="auth container py-20">
      <div className="max-w-md mx-auto">
        <h1 className="auth-title text-3xl font-bold mb-8">Resetuj hasło</h1>

        {submitted ? (
          <div className="auth-form">
            <p className="auth-success" role="status">
              Jeśli konto istnieje, wyślemy link do zresetowania hasła.
            </p>
            <p className="auth-links">
              <Link href="/login">Wróć do logowania</Link>
            </p>
          </div>
        ) : (
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

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Wysyłanie...' : 'Wyślij link'}
            </button>

            <p className="auth-links">
              <Link href="/login">Wróć do logowania</Link>
            </p>
          </form>
        )}
      </div>
    </section>
  )
}
