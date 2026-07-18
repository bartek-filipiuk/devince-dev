import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Cohort, Program, User } from '@/payload-types'
import { dateInTz } from '@/utilities/cohortUnlock'

export const dynamic = 'force-dynamic'

export default async function CohortsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>
}) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  // Twarda bramka roli — strona wyłącznie dla admina (łapie też niezalogowanych).
  if (!user || !(Array.isArray(user.roles) && user.roles.includes('admin'))) redirect('/')

  const { cohort: cohortParam } = await searchParams
  const cohortsRes = await payload.find({
    collection: 'cohorts',
    limit: 100,
    depth: 1,
    overrideAccess: true,
    sort: '-startDate',
  })
  const cohorts = cohortsRes.docs as Cohort[]
  const selected = cohorts.find((c) => String(c.id) === cohortParam) ?? cohorts[0]
  if (!selected)
    return (
      <main className="shell" style={{ maxWidth: 720, padding: 'clamp(24px, 5vw, 48px) 0' }}>
        <h1 className="section-title">Dziś w kohorcie</h1>
        <p style={{ marginTop: 12, opacity: 0.7 }}>Brak kohort — utwórz pierwszą w panelu Payload.</p>
      </main>
    )

  const program = typeof selected.program === 'object' ? (selected.program as Program) : null
  const tz = program?.cohortConfig?.timezone || 'Europe/Warsaw'
  const today = dateInTz(new Date(), tz)

  const membersRes = await payload.find({
    collection: 'cohort-members',
    where: { cohort: { equals: selected.id } },
    limit: 500,
    depth: 1,
    overrideAccess: true,
  })
  const memberUsers = membersRes.docs
    .map((m) => (typeof m.user === 'object' && m.user ? (m.user as User) : null))
    .filter((u): u is User => !!u)

  const checkinsRes = memberUsers.length
    ? await payload.find({
        collection: 'checkins',
        where: {
          and: [
            { user: { in: memberUsers.map((u) => u.id) } },
            { program: { equals: program?.id ?? 0 } },
            { date: { equals: today } },
          ],
        },
        limit: 500,
        depth: 0,
        overrideAccess: true,
      })
    : { docs: [] }
  const byUser = new Map(
    checkinsRes.docs.map((c) => [
      typeof c.user === 'object' && c.user ? c.user.id : c.user,
      !!c.minimumDone,
    ]),
  )
  const doneCount = [...byUser.values()].filter(Boolean).length

  return (
    <main className="shell" style={{ maxWidth: 720, padding: 'clamp(24px, 5vw, 48px) 0' }}>
      <h1 className="section-title">Dziś w kohorcie</h1>

      <nav style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {cohorts.map((c) => (
          <Link
            key={c.id}
            href={`/cohorts-admin?cohort=${c.id}`}
            className={`btn ${c.id === selected.id ? 'btn--primary' : 'btn--ghost'}`}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <p style={{ marginTop: 28, fontSize: 18, fontWeight: 600 }}>
        {doneCount} / {memberUsers.length} z minimum ({today})
      </p>

      <ul style={{ marginTop: 16, listStyle: 'none', padding: 0 }}>
        {memberUsers.map((u) => {
          const st = byUser.get(u.id) // true=minimum, false=wpis bez minimum, undefined=brak wpisu
          const dot =
            st === true
              ? { background: 'var(--done)', border: 'none' }
              : st === false
                ? { background: 'var(--text-mut)', border: 'none' }
                : { background: 'transparent', border: '1px solid var(--line)' }
          return (
            <li
              key={u.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                fontSize: 14,
                borderTop: '1px solid var(--line-soft)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  flexShrink: 0,
                  ...dot,
                }}
              />
              <span>{u.name ?? u.email}</span>
              <span style={{ opacity: 0.5 }}>{u.email}</span>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
