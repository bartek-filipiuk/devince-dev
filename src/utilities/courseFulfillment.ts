import type { Payload } from 'payload'
import { addProgramToPurchases } from './purchases'

/**
 * Grant a buyer access to a course program: find-or-create their user (role
 * customer), add the program to `purchases` (idempotent + deduped), and return
 * a password-reset token + whether the user was newly created so the caller can
 * send the right "set / reset your password" access email.
 *
 * Extracted from the Stripe webhook's course branch so the lead-magnet confirm
 * route can reuse the EXACT same durable grant (DRY, one code path for course
 * access). The grant (purchases update) is the critical side effect and happens
 * BEFORE the token is minted; the caller sends the email best-effort.
 *
 * The forgotPassword token is generated WITHOUT sending Payload's own email
 * (`disableEmail:true` returns the raw token string in Payload 3.67), so the
 * caller delivers the access link via Brevo.
 */
export async function grantCourseAccess(
  payload: Payload,
  args: { programId: number | string; email: string },
): Promise<{ token: string; isNew: boolean; userId: number | string }> {
  const found = await payload.find({
    collection: 'users',
    where: { email: { equals: args.email } },
    limit: 1,
    overrideAccess: true,
  })
  let user = found.docs[0]
  let isNew = false
  if (!user) {
    user = await payload.create({
      collection: 'users',
      data: { email: args.email, roles: ['customer'] } as never,
      overrideAccess: true,
    })
    isNew = true
  }

  // Durable grant first — the password token is only the access-email vehicle.
  const purchases = addProgramToPurchases(user.purchases as never, args.programId as never)
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { purchases } as never,
    overrideAccess: true,
  })

  const token = (await payload.forgotPassword({
    collection: 'users',
    data: { email: args.email },
    disableEmail: true,
  })) as unknown as string

  return { token, isNew, userId: user.id }
}
