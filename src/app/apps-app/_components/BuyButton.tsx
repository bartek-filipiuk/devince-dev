'use client'
import { useState } from 'react'
import { track } from '@/utilities/track'

export function BuyButton({
  slug,
  locale,
  label,
  processingLabel,
  errorLabel,
  consentLabel,
  newsletterLabel,
  disabled,
}: {
  slug: string
  locale: string
  label: string
  processingLabel: string
  errorLabel: string
  consentLabel: string
  newsletterLabel: string
  disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  // Art. 38 pkt 13: a separate, unticked-by-default consent. The button stays
  // disabled until the buyer actively ticks it. The server re-checks this — the
  // checkbox is the UX, /api/apps/checkout is the legal gate.
  const [consented, setConsented] = useState(false)
  // Newsletter opt-in: a SEPARATE, unticked checkbox, independent of the Art. 38
  // consent. It does NOT gate the buy button and does NOT affect price — it only
  // stamps metadata.newsletter so the webhook fires a Brevo double opt-in.
  const [newsletter, setNewsletter] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buy = async () => {
    // Funnel: every buy attempt. track() is fire-and-forget and never throws.
    track('buy_click', { surface: 'apps', slug })
    if (!consented) {
      track('consent_blocked', { surface: 'apps', slug })
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/apps/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, consent: true, locale, newsletter }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'checkout failed')
      // The checkout session was created; we're redirecting to Stripe.
      track('checkout_start', { surface: 'apps', slug })
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
          onChange={(e) => {
            setConsented(e.target.checked)
            if (e.target.checked) track('consent_checked', { surface: 'apps', slug })
          }}
          disabled={busy}
        />
        <span>{consentLabel}</span>
      </label>
      <label className="newsletter-check">
        <input
          type="checkbox"
          checked={newsletter}
          onChange={(e) => setNewsletter(e.target.checked)}
          disabled={busy}
        />
        <span>{newsletterLabel}</span>
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
