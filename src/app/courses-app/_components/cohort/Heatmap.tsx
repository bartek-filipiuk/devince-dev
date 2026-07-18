import { datePlusDays } from '@/utilities/cohortUnlock'

// Siatka programLength dni (7 kolumn): bursztyn = minimum zrobione,
// wyciszony bursztyn = wpis bez minimum, faktura = brak wpisu.
// Kolory z course-theme.css (--accent = bursztyn), stany wyciszone przez var().
const CELL_BG: Record<'min' | 'entry' | 'none', string> = {
  min: 'var(--accent)',
  entry: 'var(--accent-soft)',
  none: 'var(--surface-2)',
}

export function Heatmap({
  checkins,
  programLength,
  startDate,
}: {
  checkins: { date: string; minimumDone: boolean }[]
  programLength: number
  startDate: string
}) {
  const byDate = new Map(checkins.map((c) => [c.date, c.minimumDone]))
  const cells = Array.from({ length: programLength }, (_, i) => {
    const date = datePlusDays(startDate, i)
    const entry = byDate.get(date)
    const state = entry === true ? 'min' : entry === false ? 'entry' : 'none'
    return { date, state: state as 'min' | 'entry' | 'none' }
  })
  return (
    <div
      style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, maxWidth: '18rem' }}
    >
      {cells.map((c) => (
        <div
          key={c.date}
          title={c.date}
          style={{ aspectRatio: '1', borderRadius: 3, backgroundColor: CELL_BG[c.state] }}
        />
      ))}
    </div>
  )
}
