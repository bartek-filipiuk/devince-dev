import { Suspense } from 'react'

import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { t } from '@/i18n'
import { LoginForm } from './LoginForm'

/**
 * Course-themed login for courses.devince.dev. Behaviour mirrors the main-site
 * `(frontend)/login` page (Payload native login via POST /api/users/login with
 * a same-origin `next` redirect guard), restyled with the course design system
 * (`.shell`, `.btn`, surfaces, `.eyebrow`/`.section-title`, `.auth-*`).
 *
 * Host-rewrite: on courses.devince.dev this renders at `/login`. This server
 * component resolves the locale and feeds localized strings + locale-aware
 * default `next` to the client form; the auth POST logic itself is unchanged.
 */
export default async function CoursesLoginPage() {
  const locale = await getLocale()

  return (
    <section className="shell auth-shell">
      <div className="auth-card">
        <header className="auth-head">
          <span className="eyebrow">
            <i>{t(locale, 'courses.auth.eyebrow')}</i>
          </span>
          <h1 className="section-title">{t(locale, 'courses.auth.loginTitle')}</h1>
        </header>
        <Suspense fallback={null}>
          <LoginForm
            defaultNext={getLocalizedPath('/account', locale)}
            forgotHref={getLocalizedPath('/forgot-password', locale)}
            labels={{
              email: t(locale, 'courses.auth.email'),
              password: t(locale, 'courses.auth.password'),
              submit: t(locale, 'courses.auth.submit'),
              submitting: t(locale, 'courses.auth.submitting'),
              forgot: t(locale, 'courses.auth.forgot'),
              invalidCredentials: t(locale, 'courses.auth.invalidCredentials'),
            }}
          />
        </Suspense>
      </div>
    </section>
  )
}
