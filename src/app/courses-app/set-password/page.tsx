import { Suspense } from 'react'

import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { t } from '@/i18n'
import { SetPasswordForm } from './SetPasswordForm'

/**
 * Course-themed set-password for courses.devince.dev. Behaviour mirrors the
 * main-site `(frontend)/set-password` page (Payload native reset via
 * POST /api/users/reset-password with `{ token, password }`, then a
 * same-origin `next` redirect guard via `safeNext`), restyled with the course
 * design system (`.shell`, surfaces, `.eyebrow`/`.section-title`, `.auth-*`).
 *
 * Host-rewrite: on courses.devince.dev this renders at `/set-password` (the
 * URL embedded in the post-purchase access email). This server component
 * resolves the locale and feeds localized strings + a locale-aware default
 * `next` (the course `/account`) to the client form; the reset POST logic
 * itself is unchanged from the main-site version.
 */
export default async function CoursesSetPasswordPage() {
  const locale = await getLocale()

  return (
    <section className="shell auth-shell">
      <div className="auth-card">
        <header className="auth-head">
          <span className="eyebrow">
            <i>{t(locale, 'courses.auth.eyebrow')}</i>
          </span>
          <h1 className="section-title">{t(locale, 'courses.auth.setPasswordTitle')}</h1>
        </header>
        <Suspense fallback={null}>
          <SetPasswordForm
            defaultNext={getLocalizedPath('/account', locale)}
            forgotHref={getLocalizedPath('/forgot-password', locale)}
            labels={{
              password: t(locale, 'courses.auth.password'),
              confirm: t(locale, 'courses.auth.confirmPassword'),
              submit: t(locale, 'courses.auth.startCourse'),
              submitting: t(locale, 'courses.auth.activating'),
              forgot: t(locale, 'courses.auth.forgot'),
              passwordMismatch: t(locale, 'courses.auth.passwordMismatch'),
              invalidToken: t(locale, 'courses.auth.invalidToken'),
              missingToken: t(locale, 'courses.auth.missingToken'),
              sendNewLink: t(locale, 'courses.auth.sendNewLink'),
              genericError: t(locale, 'courses.auth.genericError'),
            }}
          />
        </Suspense>
      </div>
    </section>
  )
}
