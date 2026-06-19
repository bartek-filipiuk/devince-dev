'use client'
import { useState } from 'react'
import { track } from '@/utilities/track'

/**
 * Lead-magnet email capture — rendered INSTEAD of the paid buy control when an
 * item's `accessMode === 'lead-magnet'`. Posts `{surface, slug, email}` to
 * /api/free-claim, which validates the item is a published lead-magnet
 * SERVER-SIDE and fires Brevo's double opt-in. No access is granted here; the
 * user confirms via the email, which lands on /claim/confirmed.
 *
 * Theming: a `surface`-specific extra class (`lead-magnet--apps` /
 * `lead-magnet--courses`) lets each subdomain's theme style the form.
 */
export function LeadMagnetForm({
  surface,
  slug,
  emailLabel,
  emailPlaceholder,
  submitLabel,
  processingLabel,
  noteLabel,
  successLabel,
  errorLabel,
  invalidEmailLabel,
  unavailableLabel,
}: {
  surface: 'apps' | 'courses'
  slug: string
  emailLabel: string
  emailPlaceholder: string
  submitLabel: string
  processingLabel: string
  noteLabel: string
  successLabel: string
  errorLabel: string
  invalidEmailLabel: string
  unavailableLabel: string
}) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    track('leadmagnet_submit', { surface, slug })
    const value = email.trim()
    if (!EMAIL_RE.test(value)) {
      setError(invalidEmailLabel)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/free-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surface, slug, email: value }),
      })
      if (res.status === 503) {
        setError(unavailableLabel)
        setBusy(false)
        return
      }
      if (res.status === 429) {
        // Same friendly "try again" as a generic error — never expose the limiter.
        setError(errorLabel)
        setBusy(false)
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error('free-claim failed')
      track('leadmagnet_sent', { surface, slug })
      setDone(true)
    } catch {
      setError(errorLabel)
      setBusy(false)
    }
  }

  if (done) {
    return (
      <p className={`lead-magnet__success lead-magnet--${surface}`} role="status">
        {successLabel}
      </p>
    )
  }

  return (
    <form className={`lead-magnet lead-magnet--${surface}`} onSubmit={submit} noValidate>
      <label className="lead-magnet__field">
        <span className="lead-magnet__label">{emailLabel}</span>
        <input
          type="email"
          className="lead-magnet__input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={emailPlaceholder}
          autoComplete="email"
          required
          disabled={busy}
          aria-invalid={error ? true : undefined}
        />
      </label>
      <button
        type="submit"
        className="btn btn--primary btn--lg lead-magnet__submit"
        aria-busy={busy}
        disabled={busy}
      >
        {busy ? processingLabel : submitLabel}
      </button>
      <p className="lead-magnet__note">{noteLabel}</p>
      {error ? (
        <p className="lead-magnet__error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}
