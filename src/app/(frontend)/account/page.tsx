import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from './LogoutButton'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect('/login?next=/account')

  const purchasedIds = (user.purchases ?? []).map((p: any) => (typeof p === 'object' ? p.id : p))
  const programs = purchasedIds.length
    ? (
        await payload.find({
          collection: 'program',
          where: { id: { in: purchasedIds } },
          overrideAccess: true,
        })
      ).docs
    : []

  return (
    <section className="account container py-20">
      <div className="max-w-2xl mx-auto">
        <div className="account-header flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Twoje kursy</h1>
          <LogoutButton />
        </div>

        {programs.length === 0 && <p>Nie masz jeszcze żadnych kursów.</p>}

        <ul className="account-courses">
          {programs.map((p: any) => (
            <li key={p.id}>
              <Link href={`/learn/${p.slug}`}>{p.title}</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
