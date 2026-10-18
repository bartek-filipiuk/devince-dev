'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { track } from '@/utilities/track'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Signup for news about the channel's MCP server. Posts to /api/newsletter/subscribe
 * with `source: 'mcp'`; the newsletter box is a separate, unchecked opt-in that
 * the route honours only as a strict boolean.
 */
export function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!EMAIL_RE.test(value)) {
      setError('Podaj poprawny adres e-mail.')
      return
    }
    setBusy(true)
    setError(null)
    track('mcp_waitlist_submit', { newsletter })
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, source: 'mcp', newsletter }),
      })
      if (!res.ok) {
        setError(
          res.status === 503
            ? 'Zapisy chwilowo nie działają. Wróć za godzinę.'
            : 'Coś poszło nie tak. Spróbuj ponownie za chwilę.',
        )
        setBusy(false)
        return
      }
      track('mcp_waitlist_sent', { newsletter })
      setDone(true)
    } catch {
      setError('Coś poszło nie tak. Spróbuj ponownie za chwilę.')
      setBusy(false)
    }
  }

  if (done) {
    return (
      <p role="status" className="border-l-4 border-primary bg-card p-4 font-medium">
        Sprawdź skrzynkę i kliknij link w mailu. Bez tego kliknięcia nie trafisz na listę.
      </p>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Twój e-mail</span>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ty@example.com"
          autoComplete="email"
          required
          disabled={busy}
          aria-invalid={error ? true : undefined}
        />
      </label>
      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
          checked={newsletter}
          onChange={(e) => setNewsletter(e.target.checked)}
          disabled={busy}
        />
        <span>
          Chcę też dostawać newsletter: kolejne paczki z filmów i informacje o warsztatach, mniej
          więcej raz w tygodniu. To osobna zgoda, serwer działa bez niej.
        </span>
      </label>
      <Button type="submit" size="lg" disabled={busy} aria-busy={busy}>
        {busy ? 'Zapisuję…' : 'Zapisz mnie'}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  )
}
