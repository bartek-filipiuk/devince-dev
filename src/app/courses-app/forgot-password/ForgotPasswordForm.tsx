'use client'

import Link from 'next/link'
import React, { useState } from 'react'

type Labels = {
  email: string
  submit: string
  submitting: string
  sent: string
  backToLogin: string
}

export function ForgotPasswordForm({
  loginHref,
  labels,
}: {
  loginHref: string
  labels: Labels
}) {
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

  if (submitted) {
    return (
      <div className="auth-form">
        {/* No `.auth-success` class exists in course-theme.css; use a themed,
            self-contained inline style built from the same design tokens as
            `.auth-error` so this page needs no CSS-file change. */}
        <p
          role="status"
          style={{
            margin: 0,
            fontSize: '13.5px',
            lineHeight: 1.5,
            color: 'var(--text-mut)',
            background: 'var(--surface-2)',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--r-chip)',
            padding: '11px 13px',
          }}
        >
          {labels.sent}
        </p>
        <p className="auth-links">
          <Link href={loginHref}>{labels.backToLogin}</Link>
        </p>
      </div>
    )
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

      <button className="btn btn--primary btn--lg auth-submit" type="submit" disabled={loading}>
        {loading ? labels.submitting : labels.submit}
      </button>

      <p className="auth-links">
        <Link href={loginHref}>{labels.backToLogin}</Link>
      </p>
    </form>
  )
}
