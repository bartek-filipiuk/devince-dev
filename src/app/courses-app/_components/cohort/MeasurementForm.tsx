'use client'
import { useState, type FormEvent } from 'react'

type Metric = { key: string; label: string; unit: string; min: number | null; max: number | null }

// KONTRAKT: upsert pomiaru jest FULL-REPLACE per punkt — wysyłamy komplet
// wartości metryk z formularza (nulle odfiltrowane). Prefill z `existing`.
export function MeasurementForm({
  programSlug,
  points,
  metrics,
  existing,
}: {
  programSlug: string
  points: { key: string; label: string }[]
  metrics: Metric[]
  existing: Record<string, Record<string, number>>
}) {
  const [point, setPoint] = useState(points[0]?.key ?? '')
  const [values, setValues] = useState<Record<string, number | null>>(existing[point] ?? {})
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function switchPoint(p: string) {
    setPoint(p)
    setValues(existing[p] ?? {})
    setStatus(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v != null))
    const res = await fetch('/api/courses/measurement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programSlug, point, values: clean }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    setStatus(res.ok ? 'Zapisane.' : (data.error ?? 'Nie udało się zapisać'))
  }

  return (
    <form onSubmit={submit} className="auth-form" style={{ marginTop: 16, gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {points.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => switchPoint(p.key)}
            className={`btn${p.key === point ? ' btn--primary' : ''}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {metrics.map((m) => (
        <div key={m.key} className="auth-field">
          <label className="auth-label" htmlFor={`m-${m.key}`}>
            {m.label}
            {m.unit ? ` (${m.unit})` : ''}
          </label>
          <input
            id={`m-${m.key}`}
            className="auth-input"
            type="number"
            step="any"
            min={m.min ?? undefined}
            max={m.max ?? undefined}
            value={values[m.key] == null ? '' : String(values[m.key])}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [m.key]: e.target.value === '' ? null : Number(e.target.value) }))
            }
          />
        </div>
      ))}
      <button type="submit" disabled={busy} className="btn btn--primary btn--lg" style={{ alignSelf: 'start' }}>
        {busy ? 'Zapisuję…' : 'Zapisz pomiar'}
      </button>
      {status ? <p style={{ fontSize: 13, opacity: 0.8, margin: 0 }}>{status}</p> : null}
    </form>
  )
}
