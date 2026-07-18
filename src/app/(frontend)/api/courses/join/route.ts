// Join flow zaproszeń kohortowych: token → konto + purchases + członkostwo.
//
// Granice zaufania:
// - email konta pochodzi WYŁĄCZNIE z invite'a — nigdy z body requestu,
// - jednorazowość tokenu egzekwowana atomowym warunkowym UPDATE (RETURNING),
// - not-found / zużyty / przeterminowany → identyczne 403 bez rozróżnienia.
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { sql } from '@payloadcms/db-postgres'
import { addProgramToPurchases } from '@/utilities/purchases'

export const dynamic = 'force-dynamic'

// Jednolita odmowa: nie zdradzamy czy token istnieje / był użyty / wygasł.
const denied = () => NextResponse.json({ error: 'Zaproszenie jest nieaktywne' }, { status: 403 })

const refId = (ref: unknown): number | null => {
  if (typeof ref === 'number') return ref
  if (ref && typeof ref === 'object' && 'id' in ref) return (ref as { id: number }).id
  return null
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Nieprawidłowe dane' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null)
    return NextResponse.json({ error: 'Nieprawidłowe dane' }, { status: 400 })
  const { token, name, password } = body as Record<string, unknown>
  if (typeof token !== 'string' || token.length < 1 || token.length > 200)
    return NextResponse.json({ error: 'Nieprawidłowe dane' }, { status: 400 })
  if (typeof name !== 'string' || name.trim().length < 1 || name.length > 100)
    return NextResponse.json({ error: 'Podaj imię (do 100 znaków)' }, { status: 400 })
  if (typeof password !== 'string' || password.length < 10 || password.length > 200)
    return NextResponse.json({ error: 'Hasło musi mieć co najmniej 10 znaków' }, { status: 400 })

  const payload = await getPayload({ config: configPromise })
  const res = await payload.find({
    collection: 'course-invites',
    where: { token: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const invite = res.docs[0]
  if (!invite || invite.usedAt || !invite.expiresAt || Date.parse(String(invite.expiresAt)) <= Date.now())
    return denied()

  const programId = refId(invite.program)
  const cohortId = refId(invite.cohort)
  // Program/kohorta mogły zostać usunięte po wystawieniu invite'a.
  if (!programId || !cohortId) return denied()
  // GRANICA ZAUFANIA: email pochodzi WYŁĄCZNIE z invite'a — nigdy z body.
  const email = invite.email

  const found = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  let user = found.docs[0]
  let existing = Boolean(user)
  if (!user) {
    try {
      user = await payload.create({
        collection: 'users',
        data: { email, password, name: name.trim(), roles: ['customer'], purchases: [programId] } as never,
        overrideAccess: true,
      })
    } catch (err) {
      // Wyścig dwóch równoległych acceptów: drugi create pada na unikalności
      // emaila — dołącz do świeżo utworzonego konta zamiast zwracać 500.
      const again = await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      user = again.docs[0]
      if (!user) throw err
      existing = true
    }
  }
  if (existing) {
    // Konto już istnieje (np. kupione inne kursy) — dopisz program, hasła NIE ruszamy.
    const purchases = addProgramToPurchases(user.purchases as never, programId as never)
    await payload.update({ collection: 'users', id: user.id, data: { purchases } as never, overrideAccess: true })
  }

  try {
    await payload.create({
      collection: 'cohort-members',
      data: { user: user.id, cohort: cohortId, program: programId, joinedAt: new Date().toISOString() },
      overrideAccess: true,
    })
  } catch (err) {
    // unikalny (user, program) → już przypisany — no-op
    const msg = String((err as Error)?.message || '').toLowerCase()
    if (!msg.includes('duplicate key') && !msg.includes('unique'))
      // membership nie powstało z innego powodu — nie blokuj invite flow (admin
      // dopina członkostwo ręcznie), ale zostaw ślad.
      console.error('[join] membership create failed:', err)
  }

  // Atomowe zużycie tokenu: warunkowy UPDATE z RETURNING — dokładnie jeden
  // request wygrywa; przegrany wyścig = zaproszenie już skonsumowane.
  // Celowo PO utworzeniu konta: gdy create rzuci, token zostaje niezużyty
  // i uczestnik może spróbować ponownie (side effecty są idempotentne).
  const claimed = (await payload.db.drizzle.execute(
    sql`UPDATE course_invites SET used_at = now() WHERE id = ${invite.id} AND used_at IS NULL RETURNING id`,
  )) as { rows?: unknown[] } | unknown[]
  const rows = Array.isArray(claimed) ? claimed : (claimed?.rows ?? [])
  if (!rows.length) return denied()

  return NextResponse.json({ ok: true, email, existing })
}
