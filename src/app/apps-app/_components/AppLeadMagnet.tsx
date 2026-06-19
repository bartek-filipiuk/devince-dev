import { t, type Locale } from '@/i18n'
import { LeadMagnetForm } from '../../_shared/LeadMagnetForm'

/**
 * Apps-surface wrapper around the shared LeadMagnetForm: gathers the i18n copy
 * (PL/EN) and renders the form with the `apps` surface so it posts to
 * /api/free-claim with the right surface and gets apps-themed classes.
 */
export function AppLeadMagnet({ slug, locale }: { slug: string; locale: Locale }) {
  return (
    <LeadMagnetForm
      surface="apps"
      slug={slug}
      emailLabel={t(locale, 'leadMagnet.emailLabel')}
      emailPlaceholder={t(locale, 'leadMagnet.emailPlaceholder')}
      submitLabel={t(locale, 'leadMagnet.submit')}
      processingLabel={t(locale, 'leadMagnet.processing')}
      noteLabel={t(locale, 'leadMagnet.note')}
      successLabel={t(locale, 'leadMagnet.success')}
      errorLabel={t(locale, 'leadMagnet.error')}
      invalidEmailLabel={t(locale, 'leadMagnet.invalidEmail')}
      unavailableLabel={t(locale, 'leadMagnet.unavailable')}
    />
  )
}
