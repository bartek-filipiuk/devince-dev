'use client'
import { useState } from 'react'

export function BuyButton({
  slug,
  label,
  processingLabel,
  errorLabel,
  disabled,
}: {
  slug: string
  label: string
  processingLabel: string
  errorLabel: string
  disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buy = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/apps/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
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
      <button
        className="btn btn--primary btn--lg"
        onClick={buy}
        disabled={disabled || busy}
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
