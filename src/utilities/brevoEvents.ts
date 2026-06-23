// Mapping for Brevo transactional event webhooks → our DownloadGrant `emailStatus`.
// Pure (no I/O) so it can be unit-tested without Payload/HTTP.

export type EmailStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'bounced'
  | 'deferred'
  | 'spam'
  | 'failed'

// Higher rank = more advanced/important. Problem states (bounced/spam) outrank
// the happy path so they always win; `opened` outranks `delivered` so a late
// `delivered` event can't downgrade an already-`opened` grant.
const RANK: Record<EmailStatus, number> = {
  pending: 0,
  failed: 1,
  deferred: 2,
  sent: 3,
  delivered: 5,
  opened: 6,
  spam: 8,
  bounced: 8,
}

/** Map a Brevo transactional event name to an EmailStatus (null = ignore). */
export function mapBrevoEvent(event: string): EmailStatus | null {
  switch (event) {
    case 'delivered':
      return 'delivered'
    case 'opened':
    case 'uniqueOpened':
    case 'click':
      return 'opened'
    case 'hardBounce':
    case 'blocked':
    case 'invalid':
      return 'bounced'
    case 'softBounce':
    case 'deferred':
      return 'deferred'
    case 'spam':
      return 'spam'
    case 'error':
      return 'failed'
    default:
      return null
  }
}

/** Apply `next` only if it's more advanced/important than the current status. */
export function shouldUpgrade(current: EmailStatus | null | undefined, next: EmailStatus): boolean {
  const cur = current && current in RANK ? RANK[current] : 0
  return RANK[next] > cur
}
