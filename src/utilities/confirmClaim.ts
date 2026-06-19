import type { Payload } from 'payload'
import { verifyClaim } from './claimToken'
import { createDownloadGrant } from './appsFulfillment'
import { grantCourseAccess } from './courseFulfillment'
import { sendCourseAccessEmail, sendDownloadLinkEmail } from './brevo'

/**
 * confirmClaim — the GRANT step of the lead-magnet flow (free access).
 *
 * This is where a signed claim token is REDEEMED for real access. It is the
 * enforcement point of the security model:
 *
 *  1. AUTHENTICITY: `verifyClaim` must succeed. An invalid / forged / garbage /
 *     wrong-secret token returns `{status:'invalid'}` and grants NOTHING. This
 *     is the ONLY thing standing between an HTTP GET to /claim/confirmed and a
 *     free download/enrolment — there is no other authorization.
 *
 *  2. SINGLE-USE: BEFORE any grant we try-create a `claim-grants` row whose
 *     `token` column is UNIQUE-indexed. The FIRST confirm wins the create; any
 *     replay of the same token hits the unique constraint, we catch it, and
 *     return `{status:'used'}` WITHOUT granting again. The marker is written
 *     first so a crash mid-grant can never be replayed for a SECOND grant (at
 *     worst the email is missed and the user re-triggers, but the access already
 *     exists from the first attempt — verified by recovery, not re-grant).
 *
 *  3. GRANT per kind, reusing the SAME durable code paths as paid fulfillment:
 *       - app    → createDownloadGrant (DownloadGrant) + sendDownloadLinkEmail
 *       - course → grantCourseAccess (user + purchases + reset token) + set-password mail
 *     Email is BEST-EFFORT: the grant is durable first; a Brevo failure is
 *     swallowed and we still report `granted` (the user can recover via the
 *     download link / forgot-password). NEVER throws an email error out.
 */
export type ConfirmResult =
  | { status: 'invalid' }
  | { status: 'used' }
  | { status: 'granted'; kind: 'app' | 'course' }

export async function confirmClaim(
  payload: Payload,
  grant: string | undefined | null,
): Promise<ConfirmResult> {
  // 1) AUTHENTICITY — no valid token, no grant. verifyClaim never throws.
  if (typeof grant !== 'string' || !grant) return { status: 'invalid' }
  const claim = verifyClaim(grant)
  if (!claim) return { status: 'invalid' }

  // 2) SINGLE-USE — try-create the marker FIRST. A unique-violation == replay.
  try {
    await payload.create({
      collection: 'claim-grants',
      data: {
        token: grant,
        kind: claim.kind,
        itemId: claim.itemId,
        email: claim.email,
        claimedAt: new Date().toISOString(),
      } as never,
      overrideAccess: true,
    })
  } catch {
    // The only expected failure here is the unique-index violation on `token`
    // (already claimed). We treat ANY create error as "do not grant again" — a
    // transient DB error failing closed is strictly safer than risking a double
    // grant, and the user can simply click the link again once the DB recovers.
    return { status: 'used' }
  }

  // 3) GRANT (marker is now durable → exactly-once semantics for the grant).
  if (claim.kind === 'app') {
    const productId = claim.itemId
    const token = await createDownloadGrant(payload, { productId, email: claim.email })
    // Best-effort email — the grant above is durable.
    try {
      const product = (await payload.findByID({
        collection: 'products',
        id: Number.isNaN(Number(productId)) ? productId : Number(productId),
        depth: 0,
        overrideAccess: true,
      })) as { title?: string } | null
      const base = process.env.NEXT_PUBLIC_APPS_URL ?? 'https://apps.devince.dev'
      await sendDownloadLinkEmail({
        to: claim.email,
        link: `${base}/download/${token}`,
        productTitle: product?.title ?? 'Twój plik',
      })
    } catch (err) {
      console.error(
        `[confirmClaim] download email failed for ${claim.email} (product ${productId}); grant exists, continuing:`,
        err,
      )
    }
    return { status: 'granted', kind: 'app' }
  }

  // course
  const programId = claim.itemId
  const { token, isNew } = await grantCourseAccess(payload, { programId, email: claim.email })
  // Best-effort email — the purchases grant above is durable.
  try {
    let next: string | undefined
    try {
      const program = (await payload.findByID({
        collection: 'program',
        id: Number.isNaN(Number(programId)) ? programId : Number(programId),
        depth: 0,
        overrideAccess: true,
      })) as { slug?: string } | null
      if (program?.slug) next = `/${program.slug}`
    } catch {
      /* slug is a nicety; a missing one must not block the access mail */
    }
    await sendCourseAccessEmail({
      to: claim.email,
      token,
      isNew,
      programId: String(programId),
      next,
    })
  } catch (err) {
    console.error(
      `[confirmClaim] course access email failed for ${claim.email} (program ${programId}); grant exists, continuing:`,
      err,
    )
  }
  return { status: 'granted', kind: 'course' }
}
