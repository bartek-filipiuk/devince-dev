'use client'
import { useState } from 'react'

type KeyRow = { id: number; name: string; prefix: string; createdAt: string; revoked: boolean }

export function AgentKeysPanel({ keys, mcpUrl }: { keys: KeyRow[]; mcpUrl: string }) {
  const [name, setName] = useState('')
  const [fresh, setFresh] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await fetch('/api/courses/agent-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setError(data.error ?? 'Nie udało się wygenerować klucza')
    setFresh(data.key)
  }

  async function revoke(id: number) {
    if (!confirm('Unieważnić klucz? Operacja jest natychmiastowa i nieodwracalna.')) return
    await fetch('/api/courses/agent-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    window.location.reload()
  }

  const claudeCmd = fresh
    ? `claude mcp add --transport http devince-kurs ${mcpUrl} --header "Authorization: Bearer ${fresh}"`
    : null
  const codexCmd = fresh
    ? `[mcp_servers.devince-kurs]\nurl = "${mcpUrl}"\nhttp_headers = { "Authorization" = "Bearer ${fresh}" }`
    : null

  const codeStyle: React.CSSProperties = {
    display: 'block',
    wordBreak: 'break-all',
    background: 'rgba(127,127,127,0.12)',
    borderRadius: '6px',
    padding: '0.5rem',
    fontSize: '0.75rem',
    marginTop: '0.4rem',
  }

  return (
    <div>
      {fresh ? (
        <div className="course-card" style={{ padding: '1rem' }}>
          <p style={{ fontWeight: 600 }}>
            Klucz wygenerowany — skopiuj TERAZ, nie pokażemy go ponownie:
          </p>
          <code style={codeStyle}>{fresh}</code>
          <p style={{ marginTop: '1rem', fontWeight: 600 }}>Claude Code:</p>
          <code style={codeStyle}>{claudeCmd}</code>
          <p style={{ marginTop: '1rem', fontWeight: 600 }}>Codex (config.toml):</p>
          <code style={{ ...codeStyle, whiteSpace: 'pre' }}>{codexCmd}</code>
        </div>
      ) : (
        <form className="auth-form" onSubmit={generate} style={{ maxWidth: '32rem' }}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="agent-key-name">
              Nazwa klucza
            </label>
            <input
              className="auth-input"
              id="agent-key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="np. laptop-domowy"
            />
          </div>
          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? 'Generuję…' : 'Generuj klucz'}
          </button>
        </form>
      )}
      {error ? (
        <p className="auth-error" role="alert" style={{ marginTop: '0.5rem' }}>
          {error}
        </p>
      ) : null}

      <ul style={{ marginTop: '1.5rem', listStyle: 'none', padding: 0 }}>
        {keys.map((k) => (
          <li
            key={k.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 0',
              borderTop: '1px solid rgba(127,127,127,0.15)',
              fontSize: '0.9rem',
            }}
          >
            <div>
              <p style={{ fontWeight: 600 }}>{k.name}</p>
              <p style={{ opacity: 0.6 }}>
                {k.prefix}… · {k.createdAt.slice(0, 10)}
                {k.revoked ? ' · unieważniony' : ''}
              </p>
            </div>
            {!k.revoked ? (
              <button className="btn btn--ghost" type="button" onClick={() => revoke(k.id)}>
                Unieważnij
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
