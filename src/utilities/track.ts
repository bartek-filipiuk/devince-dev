/**
 * track — client-side Umami custom-event helper.
 *
 * Fires a Umami custom event when the (env-gated) Umami script has loaded; a
 * silent no-op otherwise. Never throws, so the funnel instrumentation in the buy
 * controls is always safe to call fire-and-forget. No PII goes through here —
 * only aggregate funnel data (surface, slug).
 */

type UmamiWindow = Window & {
  umami?: { track?: (event: string, data?: Record<string, unknown>) => void }
}

export function track(event: string, data?: Record<string, unknown>): void {
  try {
    ;(window as UmamiWindow).umami?.track?.(event, data)
  } catch {
    /* no-op: Umami absent or threw — analytics must never break the UI */
  }
}
