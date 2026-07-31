'use client'

import { useEffect, useState } from 'react'

/**
 * Bridges the gap between Stripe's redirect and the webhook that creates the
 * DownloadGrant. The buyer usually lands here first, so "not ready yet" is the
 * NORMAL first state — we poll until the grant appears, then swap in the real
 * download button.
 *
 * The email remains the durable channel; this is the fast path. On timeout we
 * fall back to the email message rather than showing an error, because nothing
 * has actually failed — delivery just went the slower way.
 */
type Props = {
  sessionId: string
  labels: {
    preparing: string
    ready: string
    cta: string
    alsoEmail: string
    fallback: string
  }
}

const POLL_MS = 2000
const GIVE_UP_MS = 40_000

export function DownloadReady({ sessionId, labels }: Props) {
  const [token, setToken] = useState<string | null>(null)
  const [gaveUp, setGaveUp] = useState(false)

  useEffect(() => {
    let cancelled = false
    const startedAt = Date.now()
    let timer: ReturnType<typeof setTimeout>

    const tick = async () => {
      if (cancelled) return
      try {
        const res = await fetch(
          `/api/apps/session-grant?session_id=${encodeURIComponent(sessionId)}`,
          { cache: 'no-store' },
        )
        // A 429/400 here is not worth surfacing — the email still carries the
        // link, so we simply stop and show the fallback.
        if (res.ok) {
          const data = (await res.json()) as { ready?: boolean; token?: string }
          if (!cancelled && data.ready && data.token) {
            setToken(data.token)
            return
          }
        } else if (!cancelled) {
          setGaveUp(true)
          return
        }
      } catch {
        // Network hiccup — keep trying until the deadline.
      }
      if (cancelled) return
      if (Date.now() - startedAt >= GIVE_UP_MS) {
        setGaveUp(true)
        return
      }
      timer = setTimeout(tick, POLL_MS)
    }

    void tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [sessionId])

  if (token) {
    return (
      <div style={{ marginTop: '28px' }}>
        <p style={{ margin: '0 0 18px', fontSize: '15px', color: 'var(--text-mut)' }}>
          {labels.ready}
        </p>
        <a className="btn btn--primary btn--lg" href={`/download/${encodeURIComponent(token)}`}>
          {labels.cta}
        </a>
        <p style={{ margin: '18px 0 0', fontSize: '14px', color: 'var(--text-mut)' }}>
          {labels.alsoEmail}
        </p>
      </div>
    )
  }

  return (
    <p
      style={{
        marginTop: '18px',
        fontSize: 'clamp(15px, 1.6vw, 18px)',
        color: 'var(--text-mut)',
        lineHeight: 1.55,
        maxWidth: '48ch',
        marginInline: 'auto',
      }}
      aria-live="polite"
    >
      {gaveUp ? labels.fallback : labels.preparing}
    </p>
  )
}
