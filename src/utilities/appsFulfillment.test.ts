import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fulfillAppPurchase } from './appsFulfillment'

const grantRow = { id: 1, token: 't.sig' }

function makePayload(existing: unknown[] = []) {
  return {
    find: vi.fn().mockResolvedValue({ docs: existing }),
    create: vi.fn().mockResolvedValue(grantRow),
  }
}

describe('fulfillAppPurchase', () => {
  let savedSecret: string | undefined

  beforeEach(() => {
    savedSecret = process.env.DOWNLOAD_TOKEN_SECRET
    process.env.DOWNLOAD_TOKEN_SECRET = 'test-secret'
  })

  afterEach(() => {
    if (savedSecret === undefined) {
      delete process.env.DOWNLOAD_TOKEN_SECRET
    } else {
      process.env.DOWNLOAD_TOKEN_SECRET = savedSecret
    }
  })

  it('creates a grant with a verifiable token, 7-day expiry, maxUses 5', async () => {
    const payload = makePayload()
    const res = await fulfillAppPurchase(payload as never, {
      productId: 7,
      email: 'a@b.pl',
      sessionId: 'cs_123',
    })
    expect(res.created).toBe(true)
    expect(payload.create).toHaveBeenCalledOnce()
    const data = payload.create.mock.calls[0][0].data
    expect(data.product).toBe(7)
    expect(data.email).toBe('a@b.pl')
    expect(data.stripeSessionId).toBe('cs_123')
    expect(data.maxUses).toBe(5)
    expect(data.uses).toBe(0)
    expect(typeof data.token).toBe('string')
    expect(new Date(data.expiresAt).getTime()).toBeGreaterThan(Date.now())
  })
  it('is idempotent per stripeSessionId (existing grant => no create)', async () => {
    const payload = makePayload([grantRow])
    const res = await fulfillAppPurchase(payload as never, {
      productId: 7,
      email: 'a@b.pl',
      sessionId: 'cs_123',
    })
    expect(res.created).toBe(false)
    expect(payload.create).not.toHaveBeenCalled()
  })
  it('throws when DOWNLOAD_TOKEN_SECRET is unset', async () => {
    delete process.env.DOWNLOAD_TOKEN_SECRET
    await expect(
      fulfillAppPurchase(makePayload() as never, { productId: 7, email: 'a@b.pl', sessionId: 'cs_1' }),
    ).rejects.toThrow()
  })
})
