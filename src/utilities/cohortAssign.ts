// Przypisanie kupującego do kohorty po opłaconym checkoutcie (webhook) i
// zdjęcie membershipu przy refundzie. Wybór kohorty: najbliższa przyszła,
// fallback ostatnia; brak kohort → informacja dla admina (mail sprzedażowy).
import type { BasePayload } from 'payload'
import { dateInTz } from './cohortUnlock'

export async function assignToCohortIfCohortProgram(
  payload: BasePayload,
  userId: number,
  programId: number,
): Promise<'assigned' | 'already' | 'no-cohort' | 'not-cohort'> {
  const program = await payload.findByID({ collection: 'program', id: programId, depth: 0, overrideAccess: true })
  if (program.deliveryMode !== 'cohort') return 'not-cohort'
  const tz = program.cohortConfig?.timezone || 'Europe/Warsaw'
  const today = dateInTz(new Date(), tz)
  const upcoming = await payload.find({
    collection: 'cohorts',
    where: { and: [{ program: { equals: programId } }, { startDate: { greater_than_equal: today } }] },
    sort: 'startDate',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  let cohort = upcoming.docs[0]
  if (!cohort) {
    const latest = await payload.find({
      collection: 'cohorts',
      where: { program: { equals: programId } },
      sort: '-startDate',
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    cohort = latest.docs[0]
  }
  if (!cohort) return 'no-cohort'
  try {
    await payload.create({
      collection: 'cohort-members',
      data: { user: userId, cohort: cohort.id, program: programId, joinedAt: new Date().toISOString() },
      overrideAccess: true,
    })
  } catch {
    // unikalny (user, program) → już przypisany (re-delivery webhooka)
    return 'already'
  }
  return 'assigned'
}

export async function removeCohortMembership(payload: BasePayload, userId: number, programId: number): Promise<void> {
  const res = await payload.find({
    collection: 'cohort-members',
    where: { and: [{ user: { equals: userId } }, { program: { equals: programId } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const row = res.docs[0]
  if (row) await payload.delete({ collection: 'cohort-members', id: row.id, overrideAccess: true }).catch(() => {})
}
