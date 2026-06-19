import type { Payload } from 'payload'

type UserLike = {
  roles?: (string | null)[] | null
  purchases?: (number | { id: number } | null)[] | null
} | null | undefined

/** Admin OR the program is in the user's purchases. Mirrors the syllabus gate. */
export function isEnrolled(user: UserLike, programId: number): boolean {
  if (!user) return false
  if ((user.roles ?? []).includes('admin')) return true
  return (user.purchases ?? []).some(
    (p) => (typeof p === 'object' && p ? p.id : p) === programId,
  )
}

export function countCompleted<T extends { id: number }>(
  lessons: T[],
  completed: Set<number>,
): number {
  return lessons.reduce((a, l) => a + (completed.has(l.id) ? 1 : 0), 0)
}

export function phaseProgress<T extends { id: number; phaseId?: string | null }>(
  lessons: T[],
  completed: Set<number>,
): Map<string, { done: number; total: number }> {
  const m = new Map<string, { done: number; total: number }>()
  for (const l of lessons) {
    if (!l.phaseId) continue
    const cur = m.get(l.phaseId) ?? { done: 0, total: 0 }
    cur.total++
    if (completed.has(l.id)) cur.done++
    m.set(l.phaseId, cur)
  }
  return m
}

export function progressFor(
  total: number,
  done: number,
): { done: number; total: number; pct: number } {
  const d = Math.min(Math.max(done, 0), total)
  return { done: d, total, pct: total > 0 ? Math.round((d / total) * 100) : 0 }
}

export function firstIncompleteLesson<T extends { id: number }>(
  sortedLessons: T[],
  completed: Set<number>,
): T | null {
  for (const l of sortedLessons) if (!completed.has(l.id)) return l
  return null
}

/** Lesson ids the user has completed in a program (server-side, overrideAccess). */
export async function getCompletedLessonIds(
  payload: Payload,
  userId: number,
  programId: number,
): Promise<Set<number>> {
  const res = await payload.find({
    collection: 'lesson-progress',
    where: { and: [{ user: { equals: userId } }, { program: { equals: programId } }] },
    limit: 0,
    overrideAccess: true,
    depth: 0,
  })
  return new Set(
    res.docs.map((d: any) => (typeof d.lesson === 'object' && d.lesson ? d.lesson.id : d.lesson)),
  )
}
