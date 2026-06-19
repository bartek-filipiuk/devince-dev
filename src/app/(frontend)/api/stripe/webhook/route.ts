import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { addProgramToPurchases } from '@/utilities/purchases'
import { sendCourseAccessEmail, sendDownloadLinkEmail } from '@/utilities/brevo'
import { fulfillAppPurchase } from '@/utilities/appsFulfillment'
import { notifyEvent } from '@/utilities/notify'

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

/**
 * Fix 2 — amount/currency reconciliation (MONEY-CRITICAL).
 *
 * Given a paid Checkout Session and the Payload item (program/product) it claims
 * to be for, decide whether the buyer actually paid (at least) the item's REAL
 * price in the right currency. The expected amount is derived from the item, in
 * order of trust:
 *   1. `item.priceCents` (number) → expected = priceCents, currency = item.currency ?? 'pln'
 *   2. else `item.stripePriceId`  → retrieve the Stripe Price → expected = unit_amount, currency = price.currency
 *   3. else                       → cannot verify → REFUSE (return false)
 *
 * The gate is `amount_total != null && amount_total >= expected && currency matches`.
 * `>=` (not `===`) so a FULLER payment — e.g. Stripe-added tax/VAT, or a tip —
 * never false-rejects a legitimate buyer. Underpayment / currency substitution /
 * an unverifiable price all return false.
 *
 * On refusal: emits a `payment_mismatch` security alert (Discord + structured
 * log via notifyEvent) AND a console.error, then returns false so the caller
 * skips the grant. NEVER throws — a thrown error here would 500 the webhook.
 */
async function verifyAmount(
  session: Stripe.Checkout.Session,
  item: { priceCents?: unknown; currency?: unknown; stripePriceId?: unknown } | null,
  itemLabel: string,
  email: string,
): Promise<boolean> {
  const refuse = async (reason: string, expected?: number, expectedCurrency?: string) => {
    console.error(
      `[stripe webhook] PAYMENT MISMATCH — refusing grant (${itemLabel}, session ${session.id}): ${reason}; ` +
        `paid ${session.amount_total} ${session.currency}, expected ${expected ?? '??'} ${expectedCurrency ?? '??'}`,
    )
    await notifyEvent('payment_mismatch', {
      item: itemLabel,
      paid: session.amount_total ?? undefined,
      expected,
      currency: expectedCurrency ?? session.currency ?? 'pln',
      email,
    })
    return false
  }

  try {
    if (!item) {
      return await refuse('item not found (lookup failed)')
    }

    let expected: number | null = null
    let expectedCurrency: string | null = null

    if (typeof item.priceCents === 'number') {
      expected = item.priceCents
      expectedCurrency = typeof item.currency === 'string' ? item.currency : 'pln'
    } else if (typeof item.stripePriceId === 'string' && item.stripePriceId) {
      // No local price stored → resolve the real price from Stripe. unit_amount
      // is in minor units and matches amount_total's unit.
      const price = await getStripe().prices.retrieve(item.stripePriceId)
      expected = price.unit_amount ?? null
      expectedCurrency = price.currency ?? null
    }

    if (expected == null || expectedCurrency == null) {
      // No priceCents AND no usable stripePriceId → we cannot know the real
      // price, so we cannot prove the buyer paid it. Refuse + alert.
      return await refuse('no priceCents and no resolvable stripePriceId — cannot verify')
    }

    const paid = session.amount_total
    const paidCurrency = session.currency?.toLowerCase()
    const currencyOk = paidCurrency === expectedCurrency.toLowerCase()
    // `>=` is intentional: a fuller payment (tax/VAT/tip) must NOT false-reject.
    const amountOk = paid != null && paid >= expected

    if (!amountOk || !currencyOk) {
      const reason = !currencyOk
        ? `currency mismatch (paid ${paidCurrency}, expected ${expectedCurrency})`
        : `underpayment (paid ${paid}, expected >= ${expected})`
      return await refuse(reason, expected, expectedCurrency)
    }
    return true
  } catch (err) {
    // A Stripe price lookup failure (or anything unexpected) must fail CLOSED:
    // we couldn't verify the price, so we refuse the grant rather than risk a
    // free fulfillment. Best-effort alert; never throw out of the webhook.
    console.error(
      `[stripe webhook] amount verification threw (${itemLabel}, session ${session.id}); refusing grant:`,
      err,
    )
    try {
      await notifyEvent('payment_mismatch', {
        item: itemLabel,
        paid: session.amount_total ?? undefined,
        currency: session.currency ?? 'pln',
        email,
      })
    } catch {
      /* notifyEvent never throws, but belt-and-braces */
    }
    return false
  }
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

    // ── Fix 1: payment_status gate (MONEY-CRITICAL) ─────────────────────────
    // `checkout.session.completed` fires even when the money has NOT settled:
    // async payment methods (P24/BLIK/przelewy) complete the session in a
    // `processing`/`unpaid` state, and a $0 / mis-configured session can also
    // arrive here. Granting on any of those = free access. Require `paid`
    // BEFORE any fulfillment branch runs. Async flows that genuinely succeed
    // re-fire as `checkout.session.async_payment_succeeded` (not handled yet —
    // we simply refuse to grant on unpaid here, never the inverse).
    const paymentOk = session.payment_status === 'paid'
    if (!paymentOk) {
      console.warn(
        JSON.stringify({
          event: 'fulfillment_skipped_unpaid',
          reason: 'payment_status not paid',
          paymentStatus: session.payment_status ?? null,
          session: session.id,
          email: email ?? null,
        }),
      )
    }
    // The Stripe Payment Link / Price MUST set `metadata.programId` = the Payload
    // program id. Without it we cannot map the purchase to a course and grant
    // access — fulfillment is skipped (event is still recorded as processed).
    const programIdRaw = session.metadata?.programId
    // For app (digital download) purchases, `metadata.productId` is set by
    // /api/apps/checkout. Takes a different fulfillment path from courses.
    const productIdRaw = session.metadata?.productId

    if (email && programIdRaw && paymentOk) {
      // Program ids are NUMBERS in this project (Postgres). Coerce the string
      // from Stripe metadata to a number so it matches/stores against Payload's
      // numeric ids; fall back to the raw string only if it isn't numeric.
      const programId = Number.isNaN(Number(programIdRaw)) ? programIdRaw : Number(programIdRaw)

      // ── Fix 2: amount/currency reconciliation (MONEY-CRITICAL) ────────────
      // Load the program by the metadata id and verify the buyer actually paid
      // (at least) its real price in the right currency BEFORE granting. Without
      // this, a cheap/mis-keyed session (or one pointed at the wrong programId)
      // grants the expensive course. We use the SAME program doc later for the
      // post-purchase redirect slug, so capture it here.
      type PriceDoc = {
        slug?: string
        priceCents?: unknown
        currency?: unknown
        stripePriceId?: unknown
      }
      let programDoc: PriceDoc | null = null
      try {
        programDoc = (await payload.findByID({
          collection: 'program',
          id: programId,
          depth: 0,
          overrideAccess: true,
        })) as unknown as PriceDoc
      } catch (lookupErr) {
        console.error(
          `[stripe webhook] program lookup failed for price verification (program ${programId}); refusing grant:`,
          lookupErr,
        )
      }

      const reconciled = await verifyAmount(session, programDoc, `program ${programIdRaw}`, email)
      // On mismatch verifyAmount already logged + alerted; skip the grant (clean
      // no-op — the stripe-events row + 200 still happen below).
      if (reconciled) {
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

      // Observability: the grant above is durable — fire the sales-pulse ping.
      // Best-effort (notifyEvent never throws); placed AFTER the grant so a
      // failing log/Discord POST can never break or roll back access.
      await notifyEvent('purchase', {
        surface: 'courses',
        item: `program ${programIdRaw}`,
        amount: session.amount_total ?? undefined,
        currency: session.currency ?? 'pln',
        email,
      })

      // Art. 38 pkt 13 consent timestamp, server-stamped at checkout creation by
      // /api/courses/checkout. Absent for sessions created outside our flow (e.g.
      // a hand-made Stripe Payment Link) — the email then omits the confirmation.
      const withdrawalConsentAt = session.metadata?.withdrawalConsentAt || undefined
      // The legal gate lives at /api/courses/checkout (consent !== true → 400), so
      // every course session WE create carries this. A course session reaching here
      // without it was created outside our flow — flag it: that purchase has NO
      // durable-medium consent record (mirror the apps branch warning).
      if (!withdrawalConsentAt) {
        console.warn(
          `[stripe webhook] course purchase (program ${programIdRaw}, session ${session.id}) has no withdrawalConsentAt — created outside /api/courses/checkout; no Art. 38 pkt 13 consent recorded`,
        )
      }

      // Email delivery is best-effort and MUST NOT cause a Stripe retry storm or
      // duplicate emails. If Brevo (or token generation) fails, log and CONTINUE
      // so the event is still marked processed below. The access grant already
      // succeeded; the customer can also recover access via /forgot-password.
      try {
        // Resolve the program slug for the post-purchase redirect so the buyer
        // lands on their course right after setting a password. Reuse the
        // program doc already loaded above for price verification (no second
        // fetch). Best-effort: a missing slug must not block the access mail —
        // the grant already succeeded.
        let next: string | undefined
        const slug = programDoc?.slug
        if (slug) next = `/${slug}`

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

        await sendCourseAccessEmail({
          to: email,
          token,
          isNew,
          programId: String(programId),
          next,
          withdrawalConsentAt,
        })
      } catch (err) {
        console.error(
          `[stripe webhook] access email failed for ${email} (program ${programId}); grant succeeded, continuing:`,
          err,
        )
        // Observability: grant is OK, only the durable-medium email failed —
        // ping so the owner can recover delivery manually. Best-effort.
        await notifyEvent('email_failed', { kind: 'set-password', email })
      }
      } // end if (reconciled)
    }

    // App (digital download) fulfillment — only runs when productId is set and
    // programId is absent (programId wins if both present, matching the course
    // branch above; that would indicate a misconfigured Stripe session).
    if (email && productIdRaw && !programIdRaw && paymentOk) {
      const productId = Number.isNaN(Number(productIdRaw)) ? productIdRaw : Number(productIdRaw)

      // ── Fix 2: amount/currency reconciliation (MONEY-CRITICAL) ────────────
      // Same as the course branch: load the product by the metadata id and
      // verify the buyer paid (at least) its real price in the right currency
      // BEFORE creating the download grant. A cheap/mis-keyed session must not
      // unlock an expensive download. We re-fetch the full product for the email
      // title below; this lookup is depth:0 and just for verification.
      let productDoc:
        | { priceCents?: unknown; currency?: unknown; stripePriceId?: unknown }
        | null = null
      try {
        productDoc = (await payload.findByID({
          collection: 'products',
          id: productId,
          depth: 0,
          overrideAccess: true,
        })) as unknown as {
          priceCents?: unknown
          currency?: unknown
          stripePriceId?: unknown
        }
      } catch (lookupErr) {
        console.error(
          `[stripe webhook] product lookup failed for price verification (product ${productId}); refusing grant:`,
          lookupErr,
        )
      }

      const appReconciled = await verifyAmount(
        session,
        productDoc,
        `product ${productIdRaw}`,
        email,
      )
      // On mismatch verifyAmount already logged + alerted; skip the grant.
      if (appReconciled) {
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
      // Observability: the download grant is durable once fulfillAppPurchase
      // returns. Fire the sales-pulse ping AFTER it (best-effort, never throws).
      // `created` distinguishes a fresh sale from an idempotent re-delivery.
      if (result.created) {
        await notifyEvent('purchase', {
          surface: 'apps',
          item: `product ${productIdRaw}`,
          amount: session.amount_total ?? undefined,
          currency: session.currency ?? 'pln',
          email,
        })
      }
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
          // Observability: grant exists, only the download-link email failed.
          await notifyEvent('email_failed', { kind: 'download', email })
        }
      }
      } // end if (appReconciled)
    }

    // NDQS quest-course bridge — only runs when ndqsCourseId is set and NEITHER
    // programId NOR productId is present (mutually exclusive with the course and
    // app branches above). Best-effort, same policy as those: a failure is logged,
    // the stripe-events row + 200 still happen below — never throw, never retry.
    //
    // Fix 2 NOTE: there is NO Payload price to reconcile against here — the NDQS
    // amount is fixed on the OWNER'S Stripe Payment Link (an external, trusted
    // price), and the session carries no programId/productId we could look up. So
    // we gate on `paymentOk` ONLY (Fix 1): a paid session is sufficient to enroll.
    const ndqsCourseId = session.metadata?.ndqsCourseId
    if (email && ndqsCourseId && !programIdRaw && !productIdRaw && paymentOk) {
      const { enrollNdqsByEmail } = await import('@/utilities/ndqsEnroll')
      const r = await enrollNdqsByEmail({ email, courseId: ndqsCourseId })
      if (!r.ok) {
        console.error(
          `[stripe webhook] NDQS enroll failed (course ${ndqsCourseId}, ${email}) status=${r.status}; event recorded, recover by re-POSTing enroll-by-email`,
        )
        // Observability: the enroll (grant) did NOT succeed — surface it as a
        // failed delivery so the owner recovers it manually. Best-effort.
        await notifyEvent('email_failed', { kind: 'ndqs-enroll', email })
      } else {
        // Enroll succeeded → the NDQS access grant is durable. Sales-pulse ping.
        await notifyEvent('purchase', {
          surface: 'ndqs',
          item: `course ${ndqsCourseId}`,
          amount: session.amount_total ?? undefined,
          currency: session.currency ?? 'pln',
          email,
        })
      }
    }
  }

  // Refund → access revocation. A `charge.refunded` event does NOT carry the
  // original Checkout Session metadata, so we walk back: charge.payment_intent →
  // find the Session for that PaymentIntent → read its metadata + buyer email.
  // We revoke ALL three purchase kinds (Fix 3): NDQS enrollment, course access
  // (programId removed from user.purchases) and app downloads (download-grant
  // expired). Best-effort, same policy as the fulfillment branches above:
  // a failure is logged, the stripe-events row + 200 still happen below — never throw.
  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    const paymentIntent =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : (charge.payment_intent?.id ?? undefined)
    if (paymentIntent) {
      try {
        const sessions = await getStripe().checkout.sessions.list({
          payment_intent: paymentIntent,
          limit: 1,
        })
        const session = sessions.data[0]
        const ndqsCourseId = session?.metadata?.ndqsCourseId
        const programIdRaw = session?.metadata?.programId
        const productIdRaw = session?.metadata?.productId
        const email =
          session?.customer_details?.email ?? session?.customer_email ?? undefined

        // ── 1) NDQS revoke (the original durable revoke — runs first) ───────
        if (ndqsCourseId && email) {
          const { revokeNdqsByEmail } = await import('@/utilities/ndqsRevoke')
          const r = await revokeNdqsByEmail({ email, courseId: ndqsCourseId })
          if (!r.ok) {
            console.error(
              `[stripe webhook] NDQS revoke failed (course ${ndqsCourseId}, ${email}) status=${r.status}; event recorded, recover by re-POSTing revoke-enrollment`,
            )
          } else {
            // Revoke succeeded → access removal is durable. Refund pulse ping.
            // Best-effort (notifyEvent never throws) and AFTER the revoke.
            await notifyEvent('refund', { item: `course ${ndqsCourseId}`, email })
          }
        }

        // ── 2) Course revoke (Fix 3): remove the refunded programId from the
        // buyer's purchases. Best-effort + idempotent — removing an id that is
        // already absent is a no-op. Isolated try/catch so a failure here can
        // never break the NDQS revoke above nor the stripe-events write below.
        if (programIdRaw && email) {
          try {
            const programId = Number.isNaN(Number(programIdRaw))
              ? programIdRaw
              : Number(programIdRaw)
            const found = await payload.find({
              collection: 'users',
              where: { email: { equals: email } },
              limit: 1,
              overrideAccess: true,
            })
            const user = found.docs[0] as { id: number | string; purchases?: unknown } | undefined
            if (user) {
              const current = (user.purchases ?? []) as Array<string | number | { id: string | number }>
              const ids = current.map((p) =>
                typeof p === 'object' && p ? p.id : p,
              )
              // Compare by string so a numeric id and its string form both match.
              const target = String(programId)
              const next = ids.filter((id) => String(id) !== target)
              if (next.length !== ids.length) {
                await payload.update({
                  collection: 'users',
                  id: user.id,
                  data: { purchases: next } as never,
                  overrideAccess: true,
                })
                await notifyEvent('refund', { item: `program ${programIdRaw}`, email })
              }
            }
          } catch (courseErr) {
            console.error(
              `[stripe webhook] course refund revoke failed (program ${programIdRaw}, ${email}); event recorded, continuing:`,
              courseErr,
            )
          }
        }

        // ── 3) App revoke (Fix 3): expire the download-grant for this session
        // so the download link stops working. Idempotent — a missing grant is a
        // no-op. We EXPIRE (set expiresAt to the past) rather than delete so the
        // refund leaves an audit trail on the grant row. Isolated best-effort.
        if (productIdRaw && session?.id) {
          try {
            const grants = await payload.find({
              collection: 'download-grants',
              where: { stripeSessionId: { equals: session.id } },
              limit: 1,
              overrideAccess: true,
            })
            const grant = grants.docs[0] as { id: number | string } | undefined
            if (grant) {
              await payload.update({
                collection: 'download-grants',
                id: grant.id,
                // 1s in the past → the download route's expiry check rejects it.
                data: { expiresAt: new Date(Date.now() - 1000).toISOString() } as never,
                overrideAccess: true,
              })
              await notifyEvent('refund', { item: `product ${productIdRaw}`, email })
            }
          } catch (appErr) {
            console.error(
              `[stripe webhook] app refund revoke failed (product ${productIdRaw}, session ${session.id}); event recorded, continuing:`,
              appErr,
            )
          }
        }
      } catch (err) {
        console.error(
          `[stripe webhook] refund handling failed (payment_intent ${paymentIntent}); event recorded, continuing:`,
          err,
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
