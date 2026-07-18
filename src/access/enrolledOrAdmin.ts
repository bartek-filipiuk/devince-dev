import type { Access, Where } from 'payload'
import { clockFor } from '@/utilities/cohortClock'
import { maxUnlockedDay } from '@/utilities/cohortUnlock'
import type { Cohort, Program } from '@/payload-types'

// Odczyt lekcji: admin wszystko; klient — lekcje kupionych programów, przy czym
// dla programów kohortowych DODATKOWO nr <= najwyższy odblokowany dzień jego
// kohorty. Inwariant: treść zablokowanej lekcji nie opuszcza serwera (dotyczy
// też REST/GraphQL Payloada, nie tylko stron).
export const enrolledOrAdmin: Access = async ({ req }) => {
  const { user, payload } = req
  if (!user) return false
  if (Array.isArray(user.roles) && user.roles.includes('admin')) return true
  const ids = (user.purchases ?? []).map((p) => (typeof p === 'object' && p ? p.id : p))
  if (ids.length === 0) return false

  const programs = await payload.find({
    collection: 'program',
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
    overrideAccess: true,
  })
  const cohortPrograms = programs.docs.filter((p) => (p as Program).deliveryMode === 'cohort') as Program[]
  const cohortIds = new Set(cohortPrograms.map((p) => p.id))
  const selfIds = ids.filter((id) => !cohortIds.has(id as number))

  const ors: Where[] = selfIds.length ? [{ program: { in: selfIds } }] : []

  if (cohortPrograms.length) {
    const memberships = await payload.find({
      collection: 'cohort-members',
      where: {
        and: [{ user: { equals: user.id } }, { program: { in: [...cohortIds] } }],
      },
      limit: 100,
      depth: 1,
      overrideAccess: true,
    })
    for (const m of memberships.docs) {
      const programId = typeof m.program === 'object' && m.program ? m.program.id : m.program
      const program = cohortPrograms.find((p) => p.id === programId)
      const cohort = typeof m.cohort === 'object' ? (m.cohort as Cohort) : null
      if (!program || !cohort) continue
      const clock = clockFor(program, cohort)
      if (!clock) continue // niekompletna konfiguracja → fail-closed
      const maxDay = maxUnlockedDay(clock)
      if (maxDay >= 1)
        ors.push({ and: [{ program: { equals: program.id } }, { nr: { less_than_equal: maxDay } }] })
    }
  }

  return ors.length ? { or: ors } : false
}
