'use client'
import { useState } from 'react'

export function BuyButton({
  slug,
  locale,
  label,
  processingLabel,
  errorLabel,
  consentLabel,
  disabled,
}: {
  slug: string
  locale: string
  label: string
  processingLabel: string
  errorLabel: string
  consentLabel: string
  disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  // Art. 38 pkt 13: a separate, unticked-by-default consent. The button stays
  // disabled until the buyer actively ticks it. The server re-checks this — the
  // checkbox is the UX, /api/apps/checkout is the legal gate.
  const [consented, setConsented] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buy = async () => {
    if (!consented) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/apps/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, consent: true, locale }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'checkout failed')
      window.location.assign(data.url)
    } catch {
      setError(errorLabel)
      setBusy(false)
    }
  }

  return (
    <div>
      <label className="consent-check">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => setConsented(e.target.checked)}
          disabled={busy}
        />
        <span>{consentLabel}</span>
      </label>
      <button
        className="btn btn--primary btn--lg"
        onClick={buy}
        disabled={disabled || busy || !consented}
        aria-busy={busy}
      >
        {busy ? processingLabel : label}
      </button>
      {error ? (
        <p role="alert" style={{ marginTop: '10px', color: 'var(--destructive, red)', fontSize: '14px' }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
