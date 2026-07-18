'use client'
import { useState, type FormEvent } from 'react'

type Field = {
  key: string
  label: string
  fieldType: 'boolean' | 'number' | 'select' | 'text'
  min: number | null
  max: number | null
  options: { value: string; label: string }[]
  section: string | null
}

// KONTRAKT: upsert check-inu jest FULL-REPLACE — formularz ZAWSZE wysyła
// komplet (minimumDone + note + values ze wszystkimi ustawionymi kluczami).
// Prefill z `existing` + wysyłka całego stanu spełnia ten kontrakt.
export function CheckinForm({
  programSlug,
  date,
  fields,
  minimumLabel,
  existing,
}: {
  programSlug: string
  date: string
  fields: Field[]
  minimumLabel: string
  existing: { minimumDone?: boolean | null; note?: string | null; values?: unknown } | null
}) {
  const [minimumDone, setMinimumDone] = useState(!!existing?.minimumDone)
  const [note, setNote] = useState(existing?.note ?? '')
  const [values, setValues] = useState<Record<string, unknown>>((existing?.values as never) ?? {})
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (key: string, v: unknown) => setValues((prev) => ({ ...prev, [key]: v }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setStatus(null)
    const res = await fetch('/api/courses/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programSlug, date, minimumDone, note, values }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    setStatus(res.ok ? `Zapisane. ${data.streak} dni z minimum.` : (data.error ?? 'Nie udało się zapisać'))
  }

  // Sekcje wg field.section (null → sekcja domyślna), kolejność jak w configu.
  const sections = new Map<string, Field[]>()
  for (const f of fields) {
    const s = f.section ?? ''
    sections.set(s, [...(sections.get(s) ?? []), f])
  }

  return (
    <form onSubmit={submit} className="auth-form" style={{ marginTop: 16, gap: 20 }}>
      <label className="auth-label" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, fontSize: 15 }}>
        <input type="checkbox" checked={minimumDone} onChange={(e) => setMinimumDone(e.target.checked)} />
        {minimumLabel}
      </label>

      {[...sections.entries()].map(([section, fs]) => (
        <fieldset key={section || '_'} style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {section ? (
            <legend className="auth-label" style={{ padding: 0 }}>
              {section}
            </legend>
          ) : null}
          {fs.map((f) => (
            <div key={f.key} className="auth-field">
              <label className="auth-label" htmlFor={`f-${date}-${f.key}`}>
                {f.label}
              </label>
              {f.fieldType === 'boolean' ? (
                <input
                  id={`f-${date}-${f.key}`}
                  type="checkbox"
                  checked={!!values[f.key]}
                  onChange={(e) => set(f.key, e.target.checked)}
                  style={{ alignSelf: 'start' }}
                />
              ) : f.fieldType === 'number' ? (
                <input
                  id={`f-${date}-${f.key}`}
                  className="auth-input"
                  type="number"
                  value={values[f.key] == null ? '' : String(values[f.key])}
                  min={f.min ?? undefined}
                  max={f.max ?? undefined}
                  step="any"
                  onChange={(e) => set(f.key, e.target.value === '' ? null : Number(e.target.value))}
                />
              ) : f.fieldType === 'select' ? (
                <select
                  id={`f-${date}-${f.key}`}
                  className="auth-input"
                  value={(values[f.key] as string) ?? ''}
                  onChange={(e) => set(f.key, e.target.value || null)}
                >
                  <option value="">—</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`f-${date}-${f.key}`}
                  className="auth-input"
                  value={(values[f.key] as string) ?? ''}
                  maxLength={2000}
                  onChange={(e) => set(f.key, e.target.value || null)}
                />
              )}
            </div>
          ))}
        </fieldset>
      ))}

      <div className="auth-field">
        <label className="auth-label" htmlFor={`note-${date}`}>
          Notatka
        </label>
        <textarea
          id={`note-${date}`}
          className="auth-input"
          value={note}
          maxLength={2000}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </div>

      <button type="submit" disabled={busy} className="btn btn--primary btn--lg" style={{ alignSelf: 'start' }}>
        {busy ? 'Zapisuję…' : 'Zapisz check-in'}
      </button>
      {status ? <p style={{ fontSize: 13, opacity: 0.8, margin: 0 }}>{status}</p> : null}
    </form>
  )
}
