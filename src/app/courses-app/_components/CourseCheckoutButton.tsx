'use client'
import { useState } from 'react'
import { track } from '@/utilities/track'

export function CourseCheckoutButton({
  slug,
  locale,
  label,
  processingLabel,
  errorLabel,
  consentLabel,
  consentRequiredLabel,
  newsletterLabel,
}: {
  slug: string
  locale: string
  label: string
  processingLabel: string
  errorLabel: string
  consentLabel: string
  consentRequiredLabel: string
  newsletterLabel: string
}) {
  const [busy, setBusy] = useState(false)
  // Art. 38 pkt 13: a separate, unticked-by-default consent. The server re-checks
  // it — the checkbox is the UX, /api/courses/checkout is the legal gate.
  const [consented, setConsented] = useState(false)
  // Newsletter opt-in: a SEPARATE, unticked checkbox, fully independent of the
  // Art. 38 consent above. It never gates the buy button and never affects price —
  // it only stamps metadata.newsletter so the webhook fires a Brevo double opt-in.
  const [newsletter, setNewsletter] = useState(false)
  // Inline feedback below the button: a "tick the box" nudge or a network error.
  const [notice, setNotice] = useState<{ kind: 'consent' | 'error'; text: string } | null>(null)

  const buy = async () => {
    // Funnel: every buy attempt. track() is fire-and-forget and never throws.
    track('buy_click', { surface: 'courses', slug })
    // The button stays clickable on purpose: a dead, disabled button gives the
    // buyer no idea why nothing happens. Clicking without consent explains it.
    if (!consented) {
      track('consent_blocked', { surface: 'courses', slug })
      setNotice({ kind: 'consent', text: consentRequiredLabel })
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      const res = await fetch('/api/courses/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, consent: true, locale, newsletter }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'checkout failed')
      // The checkout session was created; we're redirecting to Stripe.
      track('checkout_start', { surface: 'courses', slug })
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
            if (e.target.checked) {
              track('consent_checked', { surface: 'courses', slug })
              setNotice(null)
            }
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
