'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useState } from 'react'
import { safeNext } from '@/utilities/safeNext'

type Labels = {
  password: string
  confirm: string
  submit: string
  submitting: string
  forgot: string
  passwordMismatch: string
  invalidToken: string
  missingToken: string
  sendNewLink: string
  genericError: string
}

export function SetPasswordForm({
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
  const token = searchParams.get('token')
  const redirectTo = safeNext(searchParams.get('next'), defaultNext)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <div className="auth-form">
        <p className="auth-error" role="alert">
          {labels.missingToken}
        </p>
        <p className="auth-links">
          <Link href={forgotHref}>{labels.sendNewLink}</Link>
        </p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError(labels.passwordMismatch)
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
        setError(labels.invalidToken)
        setLoading(false)
        return
      }

      router.push(redirectTo)
    } catch {
      setError(labels.genericError)
      setLoading(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label className="auth-label" htmlFor="password">
          {labels.password}
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
          {labels.confirm}
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

      <button className="btn btn--primary btn--lg auth-submit" type="submit" disabled={loading}>
        {loading ? labels.submitting : labels.submit}
      </button>

      <p className="auth-links">
        <Link href={forgotHref}>{labels.forgot}</Link>
      </p>
    </form>
  )
}
