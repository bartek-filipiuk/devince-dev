'use client'
import { useState } from 'react'
import { track } from '@/utilities/track'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Newsletter opt-in shown after a confirmed lead-magnet claim. Claims made by an
 * agent (channel MCP claim_package) never subscribe anyone: this is where the
 * viewer can opt in by their own click, through the regular newsletter DOI.
 */
export function ClaimNewsletterOffer(props: {
  title: string
  body: string
  placeholder: string
  submit: string
  done: string
  error: string
  invalidEmail: string
}) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!EMAIL_RE.test(value)) return setError(props.invalidEmail)
    setState('busy')
    setError(null)
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, source: 'newsletter' }),
      })
      if (!res.ok) throw new Error(String(res.status))
      track('claim_newsletter_optin')
      setState('done')
    } catch {
      setError(props.error)
      setState('idle')
    }
  }

  if (state === 'done') {
    return (
      <p className="lead-magnet__success" role="status" style={{ marginTop: '32px' }}>
        {props.done}
      </p>
    )
  }
  return (
    <form
      className="lead-magnet"
      onSubmit={submit}
      noValidate
      style={{ marginTop: '40px', maxWidth: '440px', marginInline: 'auto', textAlign: 'left' }}
    >
      <p style={{ fontWeight: 650 }}>{props.title}</p>
      <p className="lead-magnet__note">{props.body}</p>
      <input
        type="email"
        className="lead-magnet__input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={props.placeholder}
        autoComplete="email"
        aria-label={props.placeholder}
        disabled={state === 'busy'}
      />
      <button
        type="submit"
        className="btn btn--primary lead-magnet__submit"
        disabled={state === 'busy'}
      >
        {props.submit}
      </button>
      {error ? (
        <p className="lead-magnet__error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}
