// Inline SVG, bez bibliotek — skala min-max. Rysowany tylko dla 2+ punktów,
// ale broni się przed dzieleniem przez zero (data.length < 2).
export function Sparkline({ data }: { data: { date: string; value: number }[] }) {
  if (data.length < 2) return null
  const w = 240
  const h = 48
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = data
    .map((d, i) => `${(i / (data.length - 1)) * w},${h - 4 - ((d.value - min) / span) * (h - 8)}`)
    .join(' ')
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ marginTop: 4, width: '100%', color: 'var(--accent)' }}
      role="img"
      aria-label="wykres trendu"
    >
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <text x={w} y={12} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.7">
        {values[values.length - 1]}
      </text>
    </svg>
  )
}
