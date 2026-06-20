'use client'
import { useState } from 'react'
import { track } from '@/utilities/track'

type Tier = {
  name: string
  priceCents: number
  currency?: string | null
  tagline?: string | null
  features?: { item: string; id?: string | null }[] | null
  recommended?: boolean | null
  id?: string | null
}

export function ProductTierSelector({
  slug,
  tiers,
  disabled,
  // i18n strings passed from the RSC page
  chooseLicenseLabel,
  recommendedLabel,
  buyLabel,
  processingLabel,
  errorLabel,
  consentLabel,
  newsletterLabel,
  noteLabel,
}: {
  slug: string
  tiers: Tier[]
  disabled?: boolean
  chooseLicenseLabel: string
  recommendedLabel: string
  buyLabel: string
  processingLabel: string
  errorLabel: string
  consentLabel: string
  newsletterLabel: string
  noteLabel: string
}) {
  const defaultIndex = Math.max(
    tiers.findIndex((t) => t.recommended),
    0,
  )
  const [selected, setSelected] = useState(defaultIndex)
  const [busy, setBusy] = useState(false)
  // Art. 38 pkt 13: a separate, unticked-by-default consent. The button stays
  // disabled until the buyer actively ticks it. The server re-checks this — the
  // checkbox is the UX, /api/apps/checkout is the legal gate.
  const [consented, setConsented] = useState(false)
  // Newsletter opt-in: a SEPARATE, unticked checkbox, independent of the Art. 38
  // consent. It does NOT gate the buy button and does NOT affect price.
  const [newsletter, setNewsletter] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tier = tiers[selected]

  const buy = async () => {
    track('buy_click', { surface: 'apps', slug, tier: tier?.name ?? '' })
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
        body: JSON.stringify({ slug, tierIndex: selected, consent: true, locale: undefined, newsletter }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'checkout failed')
      track('checkout_start', { surface: 'apps', slug, tier: tier?.name ?? '' })
      window.location.assign(data.url)
    } catch {
      setError(errorLabel)
      setBusy(false)
    }
  }

  // Format price inline (no server import in client component)
  function fmtPrice(cents: number, currency: string | null | undefined): string {
    const curr = (currency ?? 'usd').toUpperCase()
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(cents / 100)
    } catch {
      return `${(cents / 100).toFixed(2)} ${curr}`
    }
  }

  return (
    <div className="tier-selector">
      <p className="tier-selector__label">{chooseLicenseLabel}</p>
      <div className="tier-grid" role="radiogroup" aria-label={chooseLicenseLabel}>
        {tiers.map((t, i) => (
          <label
            key={t.id ?? i}
            className={[
              'tier-card',
              i === selected ? 'tier-card--selected' : '',
              t.recommended ? 'tier-card--recommended' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <input
              type="radio"
              name="tier"
              value={i}
              checked={i === selected}
              onChange={() => setSelected(i)}
              className="tier-card__radio"
            />
            {t.recommended ? (
              <span className="tier-card__badge">{recommendedLabel}</span>
            ) : null}
            <span className="tier-card__name">{t.name}</span>
            <span className="tier-card__price">{fmtPrice(t.priceCents, t.currency)}</span>
            {t.tagline ? <span className="tier-card__tagline">{t.tagline}</span> : null}
            {t.features && t.features.length > 0 ? (
              <ul className="tier-card__features">
                {t.features.map((f, fi) => (
                  <li key={f.id ?? fi}>{f.item}</li>
                ))}
              </ul>
            ) : null}
          </label>
        ))}
      </div>

      <div className="tier-buy">
        <p className="product-price">{tier ? fmtPrice(tier.priceCents, tier.currency) : ''}</p>

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
          {busy ? processingLabel : buyLabel}
        </button>

        <p className="product-note">{noteLabel}</p>

        {error ? (
          <p role="alert" style={{ marginTop: '10px', color: 'var(--destructive, red)', fontSize: '14px' }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
