type Lesson = {
  phaseId?: string | null
  hardGate?: boolean | null
  estTimeMin?: { min?: number | null; max?: number | null } | null
}
type Phase = { letter?: string | null }

export function courseMeta(phases: Phase[] = [], lessons: Lesson[] = []) {
  const timeMin = lessons.reduce((a, l) => a + (l.estTimeMin?.min ?? 0), 0)
  const timeMax = lessons.reduce((a, l) => a + (l.estTimeMin?.max ?? 0), 0)
  return {
    phases: phases.length,
    stages: lessons.length,
    hardGates: lessons.filter((l) => l.hardGate).length,
    timeMin,
    timeMax,
  }
}
