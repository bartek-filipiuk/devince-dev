/**
 * Tiny in-memory fixed-window rate limiter.
 *
 * Used by /api/free-claim to cap how often the same IP+email can trigger a Brevo
 * double opt-in email, blunting a DOI email-bomb (spamming confirmation emails to
 * arbitrary addresses). v1 scope: a single Node process. This deliberately does
 * NOT survive a restart or coordinate across instances — it's a cheap first line
 * of defence, NOT the security boundary (that's the signed, single-use claim
 * token). For a multi-instance deploy, swap the Map for Redis behind this same
 * interface. Documented in the lead-B report.
 */

export type RateLimiter = { check: (key: string) => boolean }

export function createRateLimiter(opts: {
  max: number
  windowMs: number
  now?: () => number
}): RateLimiter {
  const { max, windowMs } = opts
  const now = opts.now ?? Date.now
  // key → { count, windowStart }
  const hits = new Map<string, { count: number; start: number }>()

  return {
    /** Returns true if this hit is ALLOWED, false if the key is over the cap. */
    check(key: string): boolean {
      const t = now()
      const entry = hits.get(key)
      if (!entry || t - entry.start >= windowMs) {
        // Fresh window. Opportunistically evict obviously-stale entries so the
        // Map can't grow unbounded under a flood of distinct keys.
        if (hits.size > 5000) {
          for (const [k, v] of hits) if (t - v.start >= windowMs) hits.delete(k)
        }
        hits.set(key, { count: 1, start: t })
        return true
      }
      if (entry.count >= max) return false
      entry.count += 1
      return true
    },
  }
}
