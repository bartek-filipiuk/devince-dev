// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { track } from './track'

// track() is the client-side Umami custom-event helper. It must call
// window.umami.track(event, data) when Umami is loaded, and be a silent no-op
// (never throwing) when the script is absent — so the funnel instrumentation in
// the buy controls is always safe to call.

afterEach(() => {
  // @ts-expect-error cleanup the injected global between tests
  delete (window as Window & { umami?: unknown }).umami
})

describe('track', () => {
  it('is a no-op (does not throw) when window.umami is undefined', () => {
    expect(() => track('buy_click', { surface: 'courses', slug: 'kurs' })).not.toThrow()
  })

  it('calls window.umami.track(event, data) when umami is present', () => {
    const umamiTrack = vi.fn()
    ;(window as Window & { umami?: { track: typeof umamiTrack } }).umami = { track: umamiTrack }
    track('checkout_start', { surface: 'apps', slug: 'app-1' })
    expect(umamiTrack).toHaveBeenCalledTimes(1)
    expect(umamiTrack).toHaveBeenCalledWith('checkout_start', { surface: 'apps', slug: 'app-1' })
  })

  it('does not throw when umami.track itself throws', () => {
    ;(window as Window & { umami?: { track: () => void } }).umami = {
      track: () => {
        throw new Error('umami exploded')
      },
    }
    expect(() => track('consent_blocked', { slug: 'kurs' })).not.toThrow()
  })
})
