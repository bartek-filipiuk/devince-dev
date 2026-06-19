/**
 * notifyEvent — the server-side, MONEY-CRITICAL event pipe.
 *
 * Called from the Stripe webhook + checkout routes AFTER a grant/fulfillment is
 * durable. Two outputs, both best-effort:
 *   1) ALWAYS a structured `console.log` line (`{ event, ...payload }`) — for the
 *      structured-log layer (greppable, picked up by the host's log drain).
 *   2) OPTIONALLY a Discord message, only when `DISCORD_WEBHOOK_URL` is set — the
 *      owner's real-time sales pulse.
 *
 * CONTRACT: this function NEVER throws and never rejects. A broken log sink or a
 * failing Discord POST is a no-op. It MUST NOT be able to break, roll back, or
 * change the response of the webhook/checkout route that calls it. Env-gated:
 * unset `DISCORD_WEBHOOK_URL` == no Discord POST == today's behavior.
 */

export type EventKind = 'purchase' | 'refund' | 'email_failed' | 'checkout_start'

/**
 * Build the human-readable Discord line for an event. Pure + total: it reads
 * only optional fields off the payload and degrades gracefully when they are
 * absent, so it can never throw. Localized (PL) to match the owner's channel.
 */
export function formatDiscord(kind: EventKind, payload: Record<string, unknown>): string {
  const item = typeof payload.item === 'string' ? payload.item : undefined
  const email = typeof payload.email === 'string' ? payload.email : undefined
  const amount = typeof payload.amount === 'number' ? payload.amount : undefined
  const currency = typeof payload.currency === 'string' ? payload.currency : 'pln'
  const failKind = typeof payload.kind === 'string' ? payload.kind : undefined

  // Amount arrives in minor units (cents/grosze). Format defensively — a bad
  // Intl input must not throw out of the best-effort pipe.
  let money: string | undefined
  if (amount !== undefined) {
    try {
      money = new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount / 100)
    } catch {
      money = `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`
    }
  }

  const join = (parts: Array<string | undefined>) => parts.filter(Boolean).join(' · ')

  switch (kind) {
    case 'purchase':
      return join(['🎉 **Sprzedaż**', item, money, email])
    case 'refund':
      return join(['↩️ **Zwrot**', item, email])
    case 'email_failed':
      return join([
        '⚠️ **Mail nie dostarczony**',
        failKind,
        email ? `${email} (grant OK, odzyskaj ręcznie)` : '(grant OK, odzyskaj ręcznie)',
      ])
    case 'checkout_start':
      return join(['🛒 **Checkout**', item, money, email])
    default:
      return join([String(kind), item, money, email])
  }
}

export async function notifyEvent(
  kind: EventKind,
  payload: Record<string, unknown>,
): Promise<void> {
  // 1) Always: structured log. Wrapped so a broken log sink can't throw.
  try {
    console.log(JSON.stringify({ event: kind, ...payload }))
  } catch {
    /* best-effort: never throw */
  }

  // 2) Optional: Discord. Env-gated — unset URL == no POST == no-op.
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: formatDiscord(kind, payload) }),
    })
  } catch {
    /* best-effort: never throw — a failing Discord POST cannot break a grant */
  }
}
