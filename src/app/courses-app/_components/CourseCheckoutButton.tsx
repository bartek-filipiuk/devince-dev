'use client'
import { useState } from 'react'

export function CourseCheckoutButton({
  slug,
  locale,
  label,
  processingLabel,
  errorLabel,
  consentLabel,
  consentRequiredLabel,
}: {
  slug: string
  locale: string
  label: string
  processingLabel: string
  errorLabel: string
  consentLabel: string
  consentRequiredLabel: string
}) {
  const [busy, setBusy] = useState(false)
  // Art. 38 pkt 13: a separate, unticked-by-default consent. The server re-checks
  // it — the checkbox is the UX, /api/courses/checkout is the legal gate.
  const [consented, setConsented] = useState(false)
  // Inline feedback below the button: a "tick the box" nudge or a network error.
  const [notice, setNotice] = useState<{ kind: 'consent' | 'error'; text: string } | null>(null)

  const buy = async () => {
    // The button stays clickable on purpose: a dead, disabled button gives the
    // buyer no idea why nothing happens. Clicking without consent explains it.
    if (!consented) {
      setNotice({ kind: 'consent', text: consentRequiredLabel })
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      const res = await fetch('/api/courses/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, consent: true, locale }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'checkout failed')
      window.location.assign(data.url)
    } catch {
      setNotice({ kind: 'error', text: errorLabel })
      setBusy(false)
    }
  }

  const consentMissing = notice?.kind === 'consent'

  return (
    <div className="checkout-block">
      <label className="consent-check" data-error={consentMissing ? '' : undefined}>
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => {
            setConsented(e.target.checked)
            if (e.target.checked) setNotice(null)
          }}
          disabled={busy}
        />
        <span>{consentLabel}</span>
      </label>
      <button
        type="button"
        className="btn btn--primary btn--lg checkout-buy"
        onClick={buy}
        aria-busy={busy}
        disabled={busy}
      >
        {busy ? processingLabel : label}
      </button>
      {notice ? (
        <p className="checkout-msg" data-kind={notice.kind} role="alert">
          {notice.text}
        </p>
      ) : null}
    </div>
  )
}
