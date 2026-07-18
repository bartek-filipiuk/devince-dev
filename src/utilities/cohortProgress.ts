// Agregacje trybu kohortowego (streak / ukończenie / trendy) na danych JEDNEGO
// usera — liczone w pamięci (≤ programLength wierszy), bez SQL-owych agregatów.
import { datePlusDays } from './cohortUnlock'

export type CheckinRow = {
  date: string
  minimumDone: boolean
  values?: Record<string, unknown> | null
}

export type ExtraTarget = {
  label?: string | null
  fieldKey: string
  matchValues: string[]
  target: number
}

export type CompletionConfig = {
  minimumDaysTarget: number
  extraTargets?: ExtraTarget[] | null
}

// Kolejne dni z minimumDone kończące się dziś; jeśli dziś nie ma wpisu,
// liczymy od wczoraj (dzień jeszcze trwa).
export function minimumStreak(checkins: CheckinRow[], today: string): number {
  const byDate = new Map(checkins.map((c) => [c.date, c.minimumDone]))
  let cursor = today
  if (!byDate.get(cursor)) cursor = datePlusDays(cursor, -1)
  let streak = 0
  while (byDate.get(cursor)) {
    streak++
    cursor = datePlusDays(cursor, -1)
  }
  return streak
}

export function completionStatus(checkins: CheckinRow[], config: CompletionConfig) {
  const minimumDays = checkins.filter((c) => c.minimumDone).length
  const extras = (config.extraTargets ?? []).map((t) => ({
    ...t,
    count: checkins.filter((c) => t.matchValues.includes(String(c.values?.[t.fieldKey] ?? ''))).length,
  }))
  const done = minimumDays >= config.minimumDaysTarget && extras.every((e) => e.count >= e.target)
  return { minimumDays, extras, done }
}

// Średnia krocząca 7 dni: dla każdego istniejącego punktu średnia wartości
// z okna [date-6d, date]. Luki w danych nie przerywają trendu.
export function weeklyAvg(points: { date: string; value: number }[]): { date: string; value: number }[] {
  return points.map((p) => {
    const from = datePlusDays(p.date, -6)
    const window = points.filter((q) => q.date >= from && q.date <= p.date)
    const avg = window.reduce((sum, q) => sum + q.value, 0) / window.length
    return { date: p.date, value: Math.round(avg * 10) / 10 }
  })
}
