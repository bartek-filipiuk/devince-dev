'use client'

import React, { useState } from 'react'

/**
 * Formularz dołączenia z zaproszenia. Email NIE jest wysyłany — serwer bierze
 * go wyłącznie z invite'a. Po sukcesie: nowe konto → auto-login i /account,
 * istniejące konto (hasło nietknięte) → przekierowanie na /login.
 */
export function JoinForm({ token }: { token: string }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/courses/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Coś poszło nie tak — spróbuj ponownie')
        setLoading(false)
        return
      }
      if (data.existing) {
        // Konto już istniało — hasło się nie zmieniło, więc logowanie po staremu.
        window.location.href = '/login'
        return
      }
      const login = await fetch('/api/users/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: data.email, password }),
      })
      window.location.href = login.ok ? '/account' : '/login'
    } catch {
      setError('Coś poszło nie tak — spróbuj ponownie')
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label className="auth-label" htmlFor="name">
          Imię
        </label>
        <input
          className="auth-input"
          id="name"
          type="text"
          autoComplete="name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="auth-field">
        <label className="auth-label" htmlFor="password">
          Hasło (min. 10 znaków)
        </label>
        <input
          className="auth-input"
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
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
        {loading ? 'Zakładam konto…' : 'Dołącz do kursu'}
      </button>
    </form>
  )
}
