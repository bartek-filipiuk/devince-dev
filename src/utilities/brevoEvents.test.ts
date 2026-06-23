import { describe, it, expect } from 'vitest'
import { mapBrevoEvent, shouldUpgrade } from './brevoEvents'

describe('mapBrevoEvent', () => {
  it('maps known Brevo events to a status', () => {
    expect(mapBrevoEvent('delivered')).toBe('delivered')
    expect(mapBrevoEvent('opened')).toBe('opened')
    expect(mapBrevoEvent('uniqueOpened')).toBe('opened')
    expect(mapBrevoEvent('click')).toBe('opened')
    expect(mapBrevoEvent('hardBounce')).toBe('bounced')
    expect(mapBrevoEvent('blocked')).toBe('bounced')
    expect(mapBrevoEvent('invalid')).toBe('bounced')
    expect(mapBrevoEvent('softBounce')).toBe('deferred')
    expect(mapBrevoEvent('deferred')).toBe('deferred')
    expect(mapBrevoEvent('spam')).toBe('spam')
    expect(mapBrevoEvent('error')).toBe('failed')
  })

  it('ignores unknown / non-delivery events', () => {
    expect(mapBrevoEvent('request')).toBeNull()
    expect(mapBrevoEvent('unsubscribed')).toBeNull()
    expect(mapBrevoEvent('')).toBeNull()
  })
})

describe('shouldUpgrade', () => {
  it('advances along the happy path', () => {
    expect(shouldUpgrade('sent', 'delivered')).toBe(true)
    expect(shouldUpgrade('delivered', 'opened')).toBe(true)
  })

  it('never downgrades opened -> delivered', () => {
    expect(shouldUpgrade('opened', 'delivered')).toBe(false)
  })

  it('lets problem states win over the happy path', () => {
    expect(shouldUpgrade('delivered', 'bounced')).toBe(true)
    expect(shouldUpgrade('opened', 'spam')).toBe(true)
  })

  it('treats null/undefined/unknown current as the lowest rank', () => {
    expect(shouldUpgrade(null, 'delivered')).toBe(true)
    expect(shouldUpgrade(undefined, 'sent')).toBe(true)
  })
})
