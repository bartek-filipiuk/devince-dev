import type { Payload } from 'payload'

type OrderInput = {
  stripeSessionId: string
  surface: 'courses' | 'apps' | 'ndqs'
  item?: string
  title?: string
  email: string
  amountPaid?: number
  currency?: string
}

const find = (payload: Payload, stripeSessionId: string) =>
  payload.find({
    collection: 'orders',
    where: { stripeSessionId: { equals: stripeSessionId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

/**
 * Ledger write after a grant. NEVER throws and never runs inside the grant's
 * transaction. Returns false only when this session is already recorded (a
 * re-delivered or second checkout event), so callers can skip duplicate emails.
 * Any other failure returns true: better a duplicate email than a lost one.
 * ponytail: find-then-create, the unique index catches the rare concurrent pair.
 */
export async function recordOrder(payload: Payload, data: OrderInput): Promise<boolean> {
  try {
    if ((await find(payload, data.stripeSessionId)).docs.length > 0) return false
    await payload.create({ collection: 'orders', data, overrideAccess: true })
    return true
  } catch (err) {
    try {
      if ((await find(payload, data.stripeSessionId)).docs.length > 0) return false
    } catch {
      /* fall through */
    }
    console.error(`[orders] could not record ${data.stripeSessionId} (grant unaffected):`, err)
    return true
  }
}

/** Refund stamp on the ledger row. Never throws. */
export async function markOrderRefunded(
  payload: Payload,
  stripeSessionId: string,
  refundedAmount: number,
) {
  try {
    const row = (await find(payload, stripeSessionId)).docs[0]
    if (!row) return
    await payload.update({
      collection: 'orders',
      id: row.id,
      data: { refundedAt: new Date().toISOString(), refundedAmount },
      overrideAccess: true,
    })
  } catch (err) {
    console.error(`[orders] could not mark refund on ${stripeSessionId}:`, err)
  }
}
