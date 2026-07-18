// Karta konsekwencji: pasek dni z minimum + paski celów dodatkowych.
type Completion = {
  minimumDays: number
  extras: { label?: string | null; count: number; target: number }[]
  done: boolean
}

function Bar({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
        <span>{label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>
          {value} / {target}
        </span>
      </div>
      <div style={{ marginTop: 6, height: 8, width: '100%', borderRadius: 4, background: 'var(--surface-2)' }}>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--accent)', width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function CompletionCard({
  completion,
  minimumDaysTarget,
}: {
  completion: Completion
  minimumDaysTarget: number
}) {
  return (
    <div className="course-card" style={{ marginTop: 12, padding: 20 }}>
      {completion.done ? (
        <p style={{ margin: 0, fontWeight: 640, color: 'var(--accent)' }}>Program ukończony ✓</p>
      ) : null}
      {minimumDaysTarget > 0 ? (
        <Bar label="Dni z minimum" value={completion.minimumDays} target={minimumDaysTarget} />
      ) : null}
      {completion.extras.map((e, i) => (
        <Bar key={i} label={e.label ?? 'Cel dodatkowy'} value={e.count} target={e.target} />
      ))}
    </div>
  )
}
