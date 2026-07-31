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
  /**
   * Hard ceiling on tracked keys. Evicting only STALE entries is not enough for
   * long windows: with a 24h window nothing goes stale for a day, so a flood of
   * distinct keys (exactly what a signup-bombing bot produces) would grow the
   * Map unbounded. Past this size we additionally drop the oldest entries.
   * Dropping is safe-ish by design — the worst case is that a long-idle key gets
   * a fresh window early, and the other barriers still apply.
   */
  maxKeys?: number
  now?: () => number
}): RateLimiter {
  const { max, windowMs } = opts
  const maxKeys = opts.maxKeys ?? 10_000
  const now = opts.now ?? Date.now
  // key → { count, windowStart }. Map preserves insertion order, so the first
  // entries iterated are the oldest — that's what the overflow eviction uses.
  const hits = new Map<string, { count: number; start: number }>()

  return {
    /** Returns true if this hit is ALLOWED, false if the key is over the cap. */
    check(key: string): boolean {
      const t = now()
      const entry = hits.get(key)
      if (!entry || t - entry.start >= windowMs) {
        if (hits.size >= maxKeys) {
          // First pass: drop everything already outside its window (free).
          for (const [k, v] of hits) if (t - v.start >= windowMs) hits.delete(k)
          // Still over? Drop oldest-first until we are back under the ceiling.
          if (hits.size >= maxKeys) {
            const overflow = hits.size - maxKeys + 1
            let dropped = 0
            for (const k of hits.keys()) {
              hits.delete(k)
              if (++dropped >= overflow) break
            }
          }
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
