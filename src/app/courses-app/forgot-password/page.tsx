import { Suspense } from 'react'

import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { t } from '@/i18n'
import { ForgotPasswordForm } from './ForgotPasswordForm'

/**
 * Course-themed forgot-password for courses.devince.dev. Behaviour mirrors the
 * main-site `(frontend)/forgot-password` page (Payload native flow via
 * POST /api/users/forgot-password with `{ email }`, then a neutral
 * confirmation message to avoid user enumeration), restyled with the course
 * design system (`.shell`, surfaces, `.eyebrow`/`.section-title`, `.auth-*`).
 *
 * Host-rewrite: on courses.devince.dev this renders at `/forgot-password`
 * (the destination of the set-password "send a new link" / login "forgot"
 * links). This server component resolves the locale and feeds localized
 * strings + a locale-aware back-to-login link to the client form; the POST
 * logic itself is unchanged from the main-site version.
 */
export default async function CoursesForgotPasswordPage() {
  const locale = await getLocale()

  return (
    <section className="shell auth-shell">
      <div className="auth-card">
        <header className="auth-head">
          <span className="eyebrow">
            <i>{t(locale, 'courses.auth.eyebrow')}</i>
          </span>
          <h1 className="section-title">{t(locale, 'courses.auth.forgotPasswordTitle')}</h1>
        </header>
        <Suspense fallback={null}>
          <ForgotPasswordForm
            loginHref={getLocalizedPath('/login', locale)}
            labels={{
              email: t(locale, 'courses.auth.email'),
              submit: t(locale, 'courses.auth.sendLink'),
              submitting: t(locale, 'courses.auth.sending'),
              sent: t(locale, 'courses.auth.resetSent'),
              backToLogin: t(locale, 'courses.auth.backToLogin'),
            }}
          />
        </Suspense>
      </div>
    </section>
  )
}
