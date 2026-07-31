import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDownloadGrant, fulfillAppPurchase } from './appsFulfillment'

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
  it('persists withdrawalConsentAt on the grant when provided', async () => {
    const payload = makePayload()
    await fulfillAppPurchase(payload as never, {
      productId: 7,
      email: 'a@b.pl',
      sessionId: 'cs_consent',
      withdrawalConsentAt: '2026-06-18T10:00:00.000Z',
    })
    const data = payload.create.mock.calls[0][0].data
    expect(data.withdrawalConsentAt).toBe('2026-06-18T10:00:00.000Z')
  })
  it('leaves withdrawalConsentAt undefined for legacy sessions without consent', async () => {
    const payload = makePayload()
    await fulfillAppPurchase(payload as never, { productId: 7, email: 'a@b.pl', sessionId: 'cs_legacy' })
    const data = payload.create.mock.calls[0][0].data
    expect(data.withdrawalConsentAt).toBeUndefined()
  })
  it('persists tier/amountPaid/currency on the grant (sales panel record)', async () => {
    const payload = makePayload()
    await fulfillAppPurchase(payload as never, {
      productId: 7,
      email: 'a@b.pl',
      sessionId: 'cs_record',
      tier: 'Pro',
      amountPaid: 29900,
      currency: 'pln',
    })
    const data = payload.create.mock.calls[0][0].data
    expect(data.tier).toBe('Pro')
    expect(data.amountPaid).toBe(29900)
    expect(data.currency).toBe('pln')
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

  it('returns {created:false} when create throws a unique-violation but re-find finds the existing grant', async () => {
    const uniqueError = new Error('unique constraint violation')
    const payload = {
      // first find: no existing grant (fast-path miss)
      find: vi
        .fn()
        .mockResolvedValueOnce({ docs: [] })
        // second find (race recovery): grant now exists
        .mockResolvedValueOnce({ docs: [grantRow] }),
      create: vi.fn().mockRejectedValue(uniqueError),
    }
    const res = await fulfillAppPurchase(payload as never, {
      productId: 7,
      email: 'a@b.pl',
      sessionId: 'cs_race',
    })
    expect(res).toEqual({ created: false })
    expect(payload.create).toHaveBeenCalledOnce()
    expect(payload.find).toHaveBeenCalledTimes(2)
  })

  it('rethrows the original error when create throws but re-find still returns nothing', async () => {
    const originalError = new Error('unexpected db error')
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      create: vi.fn().mockRejectedValue(originalError),
    }
    await expect(
      fulfillAppPurchase(payload as never, { productId: 7, email: 'a@b.pl', sessionId: 'cs_err' }),
    ).rejects.toThrow(originalError)
    expect(payload.find).toHaveBeenCalledTimes(2)
  })
})

/**
 * Regresja produkcyjna (2026-07-31): darmowe odebranie lead-magnetu wywalało
 * /claim/confirmed błędem Payloada "The following field is invalid: Product".
 *
 * Przyczyna: `download-grants.product` to relacja do `products` z kluczem
 * liczbowym, a `confirmClaim` przekazywał `claim.itemId` — string, bo `signClaim`
 * zapisuje id jako `String(item.id)`. Ścieżka płatna działała tylko dlatego, że
 * webhook konwertował id samodzielnie (webhook/route.ts:393).
 *
 * Konwersja należy do tego modułu, bo tu schodzą się OBAJ wołający zapisujący
 * `product` do bazy — łatanie po stronie wołających zostawiłoby następnego na minie.
 */
describe('productId normalization (relacja product wymaga liczby)', () => {
  let savedSecret: string | undefined
  beforeEach(() => {
    savedSecret = process.env.DOWNLOAD_TOKEN_SECRET
    process.env.DOWNLOAD_TOKEN_SECRET = 'test-secret'
  })
  afterEach(() => {
    if (savedSecret === undefined) delete process.env.DOWNLOAD_TOKEN_SECRET
    else process.env.DOWNLOAD_TOKEN_SECRET = savedSecret
  })

  it('createDownloadGrant: numeryczny string id zapisuje się jako number', async () => {
    const payload = makePayload()
    await createDownloadGrant(payload as never, { productId: '5', email: 'a@b.pl' })
    const data = payload.create.mock.calls[0][0].data
    expect(data.product).toBe(5)
    expect(typeof data.product).toBe('number')
  })

  it('fulfillAppPurchase: numeryczny string id zapisuje się jako number', async () => {
    const payload = makePayload()
    await fulfillAppPurchase(payload as never, {
      productId: '5',
      email: 'a@b.pl',
      sessionId: 'cs_str',
    })
    const data = payload.create.mock.calls[0][0].data
    expect(data.product).toBe(5)
    expect(typeof data.product).toBe('number')
  })

  it('nienumeryczne id (np. slug/mongo) zostaje nietknięte', async () => {
    const payload = makePayload()
    await createDownloadGrant(payload as never, { productId: 'abc123', email: 'a@b.pl' })
    expect(payload.create.mock.calls[0][0].data.product).toBe('abc123')
  })
})
