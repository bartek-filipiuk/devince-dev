import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import { LogoutButton } from './LogoutButton'

/**
 * Course-themed account page for courses.devince.dev. Behaviour mirrors the
 * main-site `(frontend)/account` page (Payload native auth, redirect to login
 * when signed-out), restyled with the course design system.
 *
 * Lists the signed-in user's purchased courses, each linking to its syllabus
 * at `/${slug}` (host-rewrite). Works for `customer`-role users — Payload login
 * does not require admin-panel access.
 */
export const dynamic = 'force-dynamic'

export default async function CoursesAccountPage() {
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
          depth: 0,
        })
      ).docs
    : []

  return (
    <section className="shell auth-shell">
      <header className="auth-account-head">
        <div>
          <span className="eyebrow">
            <i>Konto</i>
          </span>
          <h1 className="section-title">Twoje kursy</h1>
        </div>
        <LogoutButton />
      </header>

      {programs.length === 0 ? (
        <p className="store-empty">Nie masz jeszcze żadnych kursów.</p>
      ) : (
        <div className="auth-course-grid">
          {programs.map((p: any) => (
            <Link key={p.id} href={`/${p.slug}`} className="course-card auth-course-card">
              <span className="eyebrow">
                <i>Kurs</i>
              </span>
              <h2 className="course-card__title">{p.title}</h2>
              <span className="auth-course-cta">
                Otwórz sylabus
                <i className="icon" data-i="arrow" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
