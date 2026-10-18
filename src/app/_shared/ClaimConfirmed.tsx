import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { t, type Locale } from '@/i18n'
import { confirmClaim } from '@/utilities/confirmClaim'
import { ClaimNewsletterOffer } from './ClaimNewsletterOffer'

/**
 * Shared lead-magnet confirm renderer used by BOTH the apps-app and courses-app
 * route trees (the Brevo DOI redirect lands on whichever host signed the claim).
 * It performs the grant via `confirmClaim` (verify token → single-use → grant)
 * and renders the resulting state. All authorization is the signed token: no
 * token / invalid / already-used grants NOTHING and shows a friendly message.
 *
 * Rendered inside the host's themed layout so it inherits the apps/courses theme.
 */
export async function ClaimConfirmed({
  grant,
  locale,
}: {
  grant: string | undefined
  locale: Locale
}) {
  const payload = await getPayload({ config: configPromise })
  const result = await confirmClaim(payload, grant)

  const key =
    result.status === 'granted' ? 'granted' : result.status === 'used' ? 'used' : 'invalid'

  return (
    <section
      className="shell claim-confirm"
      data-status={result.status}
      style={{ padding: 'clamp(64px, 10vw, 120px) 0', textAlign: 'center' }}
    >
      <span className="eyebrow">
        <i>{t(locale, `claim.${key}.eyebrow` as never)}</i>
      </span>
      <h1
        style={{
          fontSize: 'clamp(28px, 5vw, 48px)',
          fontWeight: 720,
          marginTop: '16px',
          letterSpacing: '-0.03em',
        }}
      >
        {t(locale, `claim.${key}.title` as never)}
      </h1>
      <p
        style={{
          marginTop: '18px',
          fontSize: 'clamp(15px, 1.6vw, 18px)',
          color: 'var(--text-mut)',
          lineHeight: 1.55,
          maxWidth: '52ch',
          marginInline: 'auto',
        }}
      >
        {t(locale, `claim.${key}.body` as never)}
      </p>
      {result.status === 'granted' ? (
        <ClaimNewsletterOffer
          title={t(locale, 'claim.newsletter.title')}
          body={t(locale, 'claim.newsletter.body')}
          placeholder={t(locale, 'leadMagnet.emailPlaceholder')}
          submit={t(locale, 'claim.newsletter.submit')}
          done={t(locale, 'claim.newsletter.done')}
          error={t(locale, 'claim.newsletter.error')}
          invalidEmail={t(locale, 'leadMagnet.invalidEmail')}
          privacy={t(locale, 'claim.newsletter.privacy')}
        />
      ) : null}
    </section>
  )
}
