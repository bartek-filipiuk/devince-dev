/**
 * Brevo CONTACT-LIST helpers — list-building, distinct from the transactional
 * `brevo.ts` (/smtp/email) helper.
 *
 *   - addBrevoContact     → POST /v3/contacts                       (upsert into a list)
 *   - brevoDoubleOptin    → POST /v3/contacts/doubleOptinConfirmation (Brevo's native
 *                           double opt-in — sends a "confirm subscription" email; the
 *                           contact is added to the list only when the user clicks it)
 *
 * CONTRACT: both calls are BEST-EFFORT and NEVER throw. They run from the Stripe
 * webhook + checkout/claim paths AFTER a money-critical grant is durable, so a
 * Brevo outage / 4xx / misconfig must be a silent no-op — never a 500 that breaks
 * or rolls back access. Failures are logged (console.error) and swallowed.
 *
 * ENV-GATING: `addBrevoContact`/`brevoDoubleOptin` no-op (no fetch) when
 * `BREVO_API_KEY` is unset. `brevoDoubleOptin` additionally no-ops when no
 * `templateId` is configured — that is how the whole DOI feature "ships dark"
 * until the owner creates a Brevo DOI template and sets `BREVO_DOI_TEMPLATE_ID`.
 */

const CONTACTS_URL = 'https://api.brevo.com/v3/contacts'
const DOI_URL = 'https://api.brevo.com/v3/contacts/doubleOptinConfirmation'

/**
 * Upsert a contact into a Brevo list. `updateEnabled:true` makes it idempotent —
 * re-adding an existing contact updates its attributes rather than 400-ing.
 * Best-effort: never throws.
 */
export async function addBrevoContact(
  email: string,
  listId: number,
  attributes?: Record<string, unknown>,
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.error('[brevoContacts] addBrevoContact skipped: BREVO_API_KEY not set')
    return
  }
  const body: Record<string, unknown> = {
    email,
    listIds: [Number(listId)],
    updateEnabled: true,
  }
  if (attributes && Object.keys(attributes).length > 0) body.attributes = attributes

  try {
    const res = await fetch(CONTACTS_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      // A non-ok (e.g. duplicate_parameter when the contact already exists) is a
      // benign no-op for list-building — log and swallow, never throw.
      const text = await res.text().catch(() => '')
      console.error(`[brevoContacts] addBrevoContact non-ok ${res.status}: ${text}`)
    }
  } catch (err) {
    console.error('[brevoContacts] addBrevoContact threw (best-effort, swallowed):', err)
  }
}

/**
 * Trigger Brevo's native double opt-in: sends the user a confirmation email
 * (rendered from the owner's `templateId`); clicking its link adds them to
 * `listId` and redirects to `redirectionUrl`. Best-effort: never throws.
 *
 * NO-OPS (no fetch) when `templateId` is unset/0/unparseable — this is the
 * env-gate that lets the newsletter/lead-magnet feature ship dark until the owner
 * configures `BREVO_DOI_TEMPLATE_ID`.
 */
export async function brevoDoubleOptin(args: {
  email: string
  listId: number
  templateId: number | string | undefined
  redirectionUrl: string
  attributes?: Record<string, unknown>
}): Promise<void> {
  const templateId = Number(args.templateId)
  // Falsy / unparseable templateId → the DOI template isn't configured → no-op.
  if (!args.templateId || !Number.isFinite(templateId) || templateId <= 0) {
    console.log(
      JSON.stringify({
        event: 'brevo_doi_skipped',
        reason: 'no BREVO_DOI_TEMPLATE_ID configured',
        email: args.email,
      }),
    )
    return
  }

  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.error('[brevoContacts] brevoDoubleOptin skipped: BREVO_API_KEY not set')
    return
  }

  const body: Record<string, unknown> = {
    email: args.email,
    includeListIds: [Number(args.listId)],
    templateId,
    redirectionUrl: args.redirectionUrl,
    updateEnabled: true,
  }
  if (args.attributes && Object.keys(args.attributes).length > 0) {
    body.attributes = args.attributes
  }

  try {
    const res = await fetch(DOI_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[brevoContacts] brevoDoubleOptin non-ok ${res.status}: ${text}`)
    }
  } catch (err) {
    console.error('[brevoContacts] brevoDoubleOptin threw (best-effort, swallowed):', err)
  }
}
