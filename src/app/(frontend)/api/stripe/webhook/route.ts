import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { addProgramToPurchases } from '@/utilities/purchases'
import { sendCourseAccessEmail, sendDownloadLinkEmail } from '@/utilities/brevo'
import { fulfillAppPurchase } from '@/utilities/appsFulfillment'

// Lazy-init: constructing Stripe at module scope throws if STRIPE_SECRET_KEY is
// unset, which would crash Next.js's build-time "collect page data" step. Defer
// it to the first request so the module loads without keys present.
// apiVersion intentionally omitted — the SDK defaults to the account's pinned
// API version, which is correct for fulfillment (we only read `metadata` and
// `customer_details`, both stable). Pinning a literal version here would just
// risk drift against the dashboard.
let stripeClient: Stripe | null = null
function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string)
  }
  return stripeClient
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const sig = req.headers.get('stripe-signature') ?? ''
  // RAW body — required for signature verification. Next.js App Router route
  // handlers do NOT pre-parse the body, so `req.text()` is the unparsed payload.
  // Never JSON.parse before constructEvent — that breaks signature verification.
  const raw = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET as string)
  } catch {
    // Bad/missing signature or malformed payload — reject. This is the trust
    // boundary for the whole webhook: nothing below runs without a valid sig.
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })

  // Idempotency: if we've already recorded this event id, do nothing.
  // The hard guard is the `unique` index on `stripe-events.eventId` (the row is
  // written at the very end). A duplicate delivered concurrently could in theory
  // double-process before that row exists, but the unique index still prevents a
  // second stored row and Stripe retries are spaced out — acceptable for v1.
  const dup = await payload.find({
    collection: 'stripe-events',
    where: { eventId: { equals: event.id } },
    limit: 1,
    overrideAccess: true, // trusted webhook, no user session — see security note
  })
  if (dup.docs.length) return NextResponse.json({ received: true, duplicate: true })

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const email = session.customer_details?.email ?? session.customer_email ?? undefined
    // The Stripe Payment Link / Price MUST set `metadata.programId` = the Payload
    // program id. Without it we cannot map the purchase to a course and grant
    // access — fulfillment is skipped (event is still recorded as processed).
    const programIdRaw = session.metadata?.programId
    // For app (digital download) purchases, `metadata.productId` is set by
    // /api/apps/checkout. Takes a different fulfillment path from courses.
    const productIdRaw = session.metadata?.productId

    if (email && programIdRaw) {
      // Program ids are NUMBERS in this project (Postgres). Coerce the string
      // from Stripe metadata to a number so it matches/stores against Payload's
      // numeric ids; fall back to the raw string only if it isn't numeric.
      const programId = Number.isNaN(Number(programIdRaw)) ? programIdRaw : Number(programIdRaw)

      const found = await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
        overrideAccess: true,
      })
      let user = found.docs[0]
      let isNew = false
      if (!user) {
        user = await payload.create({
          collection: 'users',
          data: { email, roles: ['customer'] } as never,
          overrideAccess: true,
        })
        isNew = true
      }

      // Normalize + dedupe (idempotent against re-delivery of the same purchase).
      // The grant is the critical, idempotent side effect — do it first.
      const purchases = addProgramToPurchases(user.purchases as never, programId as never)
      await payload.update({
        collection: 'users',
        id: user.id,
        data: { purchases } as never,
        overrideAccess: true,
      })

      // Email delivery is best-effort and MUST NOT cause a Stripe retry storm or
      // duplicate emails. If Brevo (or token generation) fails, log and CONTINUE
      // so the event is still marked processed below. The access grant already
      // succeeded; the customer can also recover access via /forgot-password.
      try {
        // Generate a password-reset token WITHOUT sending Payload's own email
        // (we deliver the access link via Brevo). In Payload 3.67,
        // forgotPassword({ disableEmail: true }) returns the raw token string,
        // which is stored verbatim in `resetPasswordToken` and accepted as-is by
        // POST /api/users/reset-password (the /set-password page) — verified
        // against the installed Payload source.
        const token = (await payload.forgotPassword({
          collection: 'users',
          data: { email },
          disableEmail: true,
        })) as unknown as string

        await sendCourseAccessEmail({ to: email, token, isNew, programId: String(programId) })
      } catch (err) {
        console.error(
          `[stripe webhook] access email failed for ${email} (program ${programId}); grant succeeded, continuing:`,
          err,
        )
      }
    }

    // App (digital download) fulfillment — only runs when productId is set and
    // programId is absent (programId wins if both present, matching the course
    // branch above; that would indicate a misconfigured Stripe session).
    if (email && productIdRaw && !programIdRaw) {
      const productId = Number.isNaN(Number(productIdRaw)) ? productIdRaw : Number(productIdRaw)
      // Art. 38 pkt 13 consent timestamp, server-stamped at checkout creation.
      // Absent for legacy sessions predating the consent gate — fulfillment
      // stores undefined and the email omits the confirmation line.
      const withdrawalConsentAt = session.metadata?.withdrawalConsentAt || undefined
      // The legal gate lives at /api/apps/checkout (consent !== true → 400), so
      // every session WE create carries this. A download session reaching here
      // without it was created outside our flow (e.g. hand-made in the Stripe
      // dashboard) — flag it: that purchase has NO durable-medium consent record.
      if (!withdrawalConsentAt) {
        console.warn(
          `[stripe webhook] app purchase (product ${productIdRaw}, session ${session.id}) has no withdrawalConsentAt — created outside /api/apps/checkout; no Art. 38 pkt 13 consent recorded`,
        )
      }
      const result = await fulfillAppPurchase(payload, {
        productId,
        email,
        sessionId: session.id,
        withdrawalConsentAt,
      })
      if (result.created && result.token) {
        // Best-effort email, same policy as course access mails: a Brevo failure
        // must NOT fail the webhook — the grant exists; admin can resend.
        try {
          const product = await payload.findByID({
            collection: 'products',
            id: productId,
            depth: 0,
            overrideAccess: true,
          })
          const base = process.env.NEXT_PUBLIC_APPS_URL ?? 'https://apps.devince.dev'
          const emailLocale = session.metadata?.locale === 'en' ? 'en' : 'pl'
          await sendDownloadLinkEmail({
            to: email,
            link: `${base}/download/${result.token}`,
            productTitle: (product as { title?: string } | null)?.title ?? 'Twój zakup',
            locale: emailLocale,
            withdrawalConsentAt,
          })
        } catch (err) {
          console.error(
            `[stripe webhook] download email failed for ${email} (product ${productId}); grant exists, continuing:`,
            err,
          )
        }
      }
    }

    // NDQS quest-course bridge — only runs when ndqsCourseId is set and NEITHER
    // programId NOR productId is present (mutually exclusive with the course and
    // app branches above). Best-effort, same policy as those: a failure is logged,
    // the stripe-events row + 200 still happen below — never throw, never retry.
    const ndqsCourseId = session.metadata?.ndqsCourseId
    if (email && ndqsCourseId && !programIdRaw && !productIdRaw) {
      const { enrollNdqsByEmail } = await import('@/utilities/ndqsEnroll')
      const r = await enrollNdqsByEmail({ email, courseId: ndqsCourseId })
      if (!r.ok) {
        console.error(
          `[stripe webhook] NDQS enroll failed (course ${ndqsCourseId}, ${email}) status=${r.status}; event recorded, recover by re-POSTing enroll-by-email`,
        )
      }
    }
  }

  // Record the event last so the unique-indexed row is the durable idempotency marker.
  await payload.create({
    collection: 'stripe-events',
    data: { eventId: event.id, type: event.type } as never,
    overrideAccess: true,
  })
  return NextResponse.json({ received: true })
}

// Webhook must run on every request (raw body, no caching).
export const dynamic = 'force-dynamic'
