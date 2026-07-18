import type { BasePayload } from 'payload'
import type { Cohort, CohortMember, Program } from '@/payload-types'
import type { CohortClock } from './cohortUnlock'

// Zegar kohorty z configu programu + daty startu kohorty. null = konfiguracja
// niekompletna → wywołujący traktuje wszystko jako zablokowane (fail-closed).
export function clockFor(program: Program, cohort: Cohort): CohortClock | null {
  const cfg = program.cohortConfig
  if (program.deliveryMode !== 'cohort' || !cfg?.programLength || !cohort.startDate) return null
  return {
    startDate: String(cohort.startDate).slice(0, 10),
    unlockHour: cfg.unlockHour ?? 6,
    timezone: cfg.timezone || 'Europe/Warsaw',
    programLength: cfg.programLength,
  }
}

// Membership usera w kursie kohortowym (jedna kohorta na program — unique index).
export async function cohortMembership(
  payload: BasePayload,
  userId: number,
  programId: number,
): Promise<{ member: CohortMember; cohort: Cohort } | null> {
  const res = await payload.find({
    collection: 'cohort-members',
    where: { and: [{ user: { equals: userId } }, { program: { equals: programId } }] },
    limit: 1,
    depth: 1, // populate cohort (potrzebny startDate)
    overrideAccess: true,
  })
  const member = res.docs[0]
  if (!member || typeof member.cohort !== 'object' || !member.cohort) return null
  return { member, cohort: member.cohort }
}
