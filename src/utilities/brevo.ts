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

export async function sendDownloadLinkEmail(args: {
  to: string
  link: string
  productTitle: string
}): Promise<void> {
  const templateId = process.env.BREVO_DOWNLOAD_TEMPLATE_ID
  if (templateId) {
    await sendTransactionalEmail({
      to: args.to,
      templateId: Number(templateId),
      params: { LINK: args.link, PRODUCT: args.productTitle },
    })
    return
  }
  await sendTransactionalEmail({
    to: args.to,
    subject: `Twój zakup: ${args.productTitle} — link do pobrania`,
    htmlContent: `<p>Dziękujemy za zakup <strong>${args.productTitle}</strong>.</p><p><a href="${args.link}">Pobierz pliki</a></p><p>Link wygaśnie po 7 dniach i ma limit pobrań. Jeśli wygaśnie — odpisz na tego maila.</p>`,
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
