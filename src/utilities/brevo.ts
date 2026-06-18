// Brevo (Sendinblue) transactional email helper.
//
// NOTE: This covers purchase-driven transactional emails (e.g. course access).
// User-initiated password reset emails (Payload's /api/users/forgot-password)
// will need either a Payload email adapter (Brevo SMTP) or a custom endpoint —
// that is a B3/follow-up concern and is intentionally NOT handled here.

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

export async function sendTransactionalEmail(args: {
  to: string
  subject?: string
  htmlContent?: string
  templateId?: number
  params?: Record<string, unknown>
}): Promise<unknown> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY not set')
  // Brevo's transactional API REQUIRES a sender (400 "sender is missing"
  // otherwise). The email must be a verified sender on the Brevo account.
  const body: Record<string, unknown> = {
    sender: {
      email: process.env.BREVO_SENDER_EMAIL ?? 'bartek@devince.dev',
      name: process.env.BREVO_SENDER_NAME ?? 'Devince',
    },
    to: [{ email: args.to }],
  }
  if (args.templateId) {
    body.templateId = args.templateId
    body.params = args.params
  } else {
    body.subject = args.subject
    body.htmlContent = args.htmlContent
  }
  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`)
  return res.json()
}

/**
 * Minimal HTML-escape for values interpolated into the fallback email body.
 * Product titles are admin-entered (low risk), but a title like `C++ "Guide"`
 * would otherwise produce malformed HTML — escape for correctness + defence.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Format the consent timestamp for the durable-medium confirmation. Always in
 * Europe/Warsaw (the seller's jurisdiction) so the recorded date is unambiguous
 * regardless of the buyer's timezone. Falls back to the raw ISO string if the
 * timestamp can't be parsed.
 */
function formatConsentDate(locale: 'pl' | 'en', iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'pl-PL', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Warsaw',
  }).format(d)
}

/**
 * Art. 38 pkt 13 durable-medium confirmation block. Echoes back the consent the
 * buyer gave at checkout (express consent to immediate delivery + acknowledged
 * loss of the right of withdrawal) with the recorded date — this email IS the
 * confirmation on a durable medium that the statute requires.
 */
function buildConsentLine(locale: 'pl' | 'en', iso: string): string {
  const when = formatConsentDate(locale, iso)
  if (locale === 'en') {
    return `<hr/><p style="font-size:13px;color:#555"><strong>Confirmation of consent (Art. 38(13) of the Consumer Rights Act):</strong> on ${when} you gave express consent to begin delivery of the digital content immediately and acknowledged that, upon performance (making the file available), you lose the right of withdrawal. This message constitutes confirmation of that consent on a durable medium.</p>`
  }
  return `<hr/><p style="font-size:13px;color:#555"><strong>Potwierdzenie zgody (art. 38 pkt 13 ustawy o prawach konsumenta):</strong> w dniu ${when} wyrazili Państwo wyraźną zgodę na natychmiastowe rozpoczęcie dostarczania treści cyfrowej i przyjęli do wiadomości, że z chwilą wykonania umowy (udostępnienia pliku) tracą Państwo prawo odstąpienia od umowy. Niniejsza wiadomość stanowi potwierdzenie tej zgody na trwałym nośniku.</p>`
}

export async function sendDownloadLinkEmail(args: {
  to: string
  link: string
  productTitle: string
  locale?: 'pl' | 'en'
  // ISO timestamp of the buyer's Art. 38 pkt 13 consent. When present, the email
  // carries the durable-medium confirmation block. Absent for legacy purchases
  // made before the consent gate existed.
  withdrawalConsentAt?: string
}): Promise<void> {
  const locale = args.locale === 'en' ? 'en' : 'pl'
  const consentLine = args.withdrawalConsentAt ? buildConsentLine(locale, args.withdrawalConsentAt) : ''

  const templateId = process.env.BREVO_DOWNLOAD_TEMPLATE_ID
  if (templateId) {
    await sendTransactionalEmail({
      to: args.to,
      templateId: Number(templateId),
      params: { LINK: args.link, PRODUCT: args.productTitle, CONSENT: consentLine, LOCALE: locale },
    })
    return
  }

  const copy =
    locale === 'en'
      ? {
          subject: `Your purchase: ${args.productTitle} — download link`,
          body: `<p>Thank you for purchasing <strong>${esc(args.productTitle)}</strong>.</p><p><a href="${esc(args.link)}">Download files</a></p><p>The link expires after 7 days and has a download limit. If it expires — just reply to this email.</p>`,
        }
      : {
          subject: `Twój zakup: ${args.productTitle} — link do pobrania`,
          body: `<p>Dziękujemy za zakup <strong>${esc(args.productTitle)}</strong>.</p><p><a href="${esc(args.link)}">Pobierz pliki</a></p><p>Link wygaśnie po 7 dniach i ma limit pobrań. Jeśli wygaśnie — odpisz na tego maila.</p>`,
        }

  await sendTransactionalEmail({
    to: args.to,
    subject: copy.subject,
    htmlContent: copy.body + consentLine,
  })
}

export async function sendCourseAccessEmail(args: {
  to: string
  token: string
  isNew: boolean
  programId: string
}) {
  const base = process.env.NEXT_PUBLIC_COURSES_URL ?? 'https://courses.devince.dev'
  const link = `${base}/set-password?token=${args.token}`
  const templateId = process.env.BREVO_COURSE_ACCESS_TEMPLATE_ID
  if (templateId) {
    return sendTransactionalEmail({
      to: args.to,
      templateId: Number(templateId),
      params: { activationLink: link },
    })
  }
  return sendTransactionalEmail({
    to: args.to,
    subject: 'Twój dostęp do kursu',
    htmlContent: `<p>Dziękujemy za zakup. Ustaw hasło i wejdź do kursu:</p><p><a href="${link}">${link}</a></p>`,
  })
}
