'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Button, toast, useDocumentInfo } from '@payloadcms/ui'

/**
 * Admin button on the Product edit page: "Notify buyers of an update".
 * Shows how many unique buyers would be notified, takes an optional note, and
 * (on confirm) POSTs to the Payload collection endpoint which issues a fresh
 * download link to each buyer. Auth is the logged-in admin's session cookie.
 */
export const NotifyBuyers: React.FC = () => {
  const { id } = useDocumentInfo()
  const [count, setCount] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/products/${id}/notify-buyers/count`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setCount(typeof d?.buyers === 'number' ? d.buyers : 0))
      .catch(() => setCount(null))
  }, [id])

  const send = useCallback(async () => {
    if (sending || !id) return
    if (!window.confirm(`Wysłać powiadomienie do ${count ?? '?'} kupujących? To prawdziwe maile — operacja nieodwracalna.`)) {
      return
    }
    setSending(true)
    try {
      const res = await fetch(`/api/products/${id}/notify-buyers`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      const d = await res.json()
      if (res.ok) {
        toast.success(`Powiadomiono ${d.notified}/${d.buyers} kupujących${d.failed ? ` (błędy: ${d.failed})` : ''}.`)
      } else {
        toast.error(d?.error || 'Błąd wysyłki.')
      }
    } catch {
      toast.error('Błąd wysyłki.')
    } finally {
      setSending(false)
    }
  }, [id, note, count, sending])

  // Only on existing products (a new, unsaved product has no buyers yet).
  if (!id) return null

  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 4,
        padding: '16px 18px',
        marginBottom: 20,
        background: 'var(--theme-elevation-50)',
      }}
    >
      <h4 style={{ margin: '0 0 4px' }}>Powiadom kupujących o aktualizacji</h4>
      <p style={{ margin: '0 0 12px', color: 'var(--theme-elevation-600)', fontSize: 13 }}>
        Wyśle świeży link do pobrania <strong>bieżącej wersji</strong> do każdego kupującego (po jednym mailu, dedup po adresie).{' '}
        {count !== null ? (
          <strong>{count} {count === 1 ? 'kupujący' : 'kupujących'}.</strong>
        ) : (
          'liczenie…'
        )}
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Co się zmieniło? (np. poprawka bezpieczeństwa v1.0.7 — wpojawi się w mailu)"
        rows={2}
        style={{ width: '100%', marginBottom: 12, padding: 8, fontFamily: 'inherit', fontSize: 13 }}
      />
      <Button onClick={send} disabled={sending || !count} buttonStyle="secondary">
        {sending ? 'Wysyłanie…' : `Powiadom kupujących (${count ?? 0})`}
      </Button>
    </div>
  )
}
