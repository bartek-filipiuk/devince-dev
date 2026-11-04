'use client'

import React, { useCallback, useEffect, useRef } from 'react'

/**
 * Cloudflare Turnstile for the platform's signup forms (explicit render, so it
 * works after client-side navigation). The widget mode (Invisible) is chosen in
 * the Cloudflare dashboard, not here.
 *
 * Without NEXT_PUBLIC_TURNSTILE_SITE_KEY nothing renders and `token()` returns
 * undefined; the server skips the check until TURNSTILE_SECRET_KEY is set too.
 */
type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  getResponse: (id: string) => string | undefined
  reset: (id: string) => void
  remove: (id: string) => void
}
declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')))
    s.onerror = () => {
      loading = null
      reject(new Error('turnstile'))
    }
    document.head.appendChild(s)
  })
  return loading
}

export function useTurnstile() {
  const ref = useRef<HTMLDivElement>(null)
  const id = useRef<string | null>(null)

  useEffect(() => {
    if (!SITE_KEY || !ref.current) return
    let cancelled = false
    loadTurnstile()
      .then((t) => {
        if (cancelled || !ref.current) return
        id.current = t.render(ref.current, { sitekey: SITE_KEY })
      })
      .catch(() => {
        /* blocked script: the server rejects the submit with a clear error */
      })
    return () => {
      cancelled = true
      if (id.current) window.turnstile?.remove(id.current)
      id.current = null
    }
  }, [])

  const token = useCallback(
    () => (id.current ? window.turnstile?.getResponse(id.current) : undefined),
    [],
  )
  // Tokens are single-use: call after every submit attempt.
  const reset = useCallback(() => {
    if (id.current) window.turnstile?.reset(id.current)
  }, [])

  const widget = SITE_KEY ? <div ref={ref} className="turnstile-widget" /> : null
  return { widget, token, reset }
}
