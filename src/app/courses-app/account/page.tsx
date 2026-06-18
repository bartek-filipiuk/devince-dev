import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { t } from '@/i18n'
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
  const locale = await getLocale()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    redirect(
      `${getLocalizedPath('/login', locale)}?next=${encodeURIComponent(
        getLocalizedPath('/account', locale),
      )}`,
    )
  }

  const purchasedIds = (user.purchases ?? []).map((p: any) => (typeof p === 'object' ? p.id : p))
  const programs = purchasedIds.length
    ? (
        await payload.find({
          collection: 'program',
          where: { id: { in: purchasedIds } },
          overrideAccess: true,
          depth: 0,
          locale,
        })
      ).docs
    : []

  return (
    <section className="shell auth-shell">
      <header className="auth-account-head">
        <div>
          <span className="eyebrow">
            <i>{t(locale, 'courses.auth.eyebrow')}</i>
          </span>
          <h1 className="section-title">{t(locale, 'courses.auth.accountTitle')}</h1>
        </div>
        <LogoutButton locale={locale} />
      </header>

      {programs.length === 0 ? (
        <p className="store-empty">{t(locale, 'courses.auth.empty')}</p>
      ) : (
        <div className="auth-course-grid">
          {programs.map((p: any) => (
            <Link
              key={p.id}
              href={getLocalizedPath(`/${p.slug}`, locale)}
              className="course-card auth-course-card"
            >
              <span className="eyebrow">
                <i>{t(locale, 'courses.auth.courseEyebrow')}</i>
              </span>
              <h2 className="course-card__title">{p.title}</h2>
              <span className="auth-course-cta">
                {t(locale, 'courses.auth.openSyllabus')}
                <i className="icon" data-i="arrow" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
