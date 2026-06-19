/**
 * Tests for confirmClaim — the lead-magnet GRANT step (free access).
 *
 * This is the security boundary's enforcement point. It must:
 *  - NEVER grant without a valid signed claim token.
 *  - be single-use: a re-used token grants NOTHING a second time.
 *  - grant the right thing per kind (app: DownloadGrant; course: purchases).
 *  - keep the grant durable even if the access email fails (best-effort email).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { grantCourseAccess, createDownloadGrant, sendCourseAccessEmail, sendDownloadLinkEmail } =
  vi.hoisted(() => ({
    grantCourseAccess: vi.fn(),
    createDownloadGrant: vi.fn(),
    sendCourseAccessEmail: vi.fn(),
    sendDownloadLinkEmail: vi.fn(),
  }))

vi.mock('./courseFulfillment', () => ({ grantCourseAccess }))
vi.mock('./appsFulfillment', () => ({ createDownloadGrant }))
vi.mock('./brevo', () => ({ sendCourseAccessEmail, sendDownloadLinkEmail }))

import { confirmClaim } from './confirmClaim'
import { signClaim } from './claimToken'

const SECRET = 'claim-secret-test'

/** A payload stub whose claim-grants.create succeeds (fresh token) by default. */
function makePayload(opts?: { duplicate?: boolean; product?: Record<string, unknown> }) {
  const create = vi.fn(async () => {
    if (opts?.duplicate) {
      const e = new Error('duplicate key value violates unique constraint "claim_grants_token_idx"')
      throw e
    }
    return { id: 1 }
  })
  const findByID = vi.fn(async () => opts?.product ?? { id: 7, title: 'Free Template', slug: 'free-template' })
  return { create, findByID, _create: create, _findByID: findByID }
}

describe('confirmClaim', () => {
  let saved: string | undefined
  beforeEach(() => {
    vi.clearAllMocks()
    saved = process.env.CLAIM_TOKEN_SECRET
    process.env.CLAIM_TOKEN_SECRET = SECRET
    grantCourseAccess.mockResolvedValue({ token: 'reset-tok', isNew: true, userId: 99 })
    createDownloadGrant.mockResolvedValue('dl-tok')
    sendCourseAccessEmail.mockResolvedValue(undefined)
    sendDownloadLinkEmail.mockResolvedValue(undefined)
  })
  afterEach(() => {
    if (saved === undefined) delete process.env.CLAIM_TOKEN_SECRET
    else process.env.CLAIM_TOKEN_SECRET = saved
  })

  it('NO grant for an invalid/garbage token', async () => {
    const payload = makePayload()
    const res = await confirmClaim(payload as never, 'garbage.token')
    expect(res.status).toBe('invalid')
    expect(payload._create).not.toHaveBeenCalled()
    expect(createDownloadGrant).not.toHaveBeenCalled()
    expect(grantCourseAccess).not.toHaveBeenCalled()
  })

  it('NO grant for a missing token', async () => {
    const payload = makePayload()
    const res = await confirmClaim(payload as never, undefined)
    expect(res.status).toBe('invalid')
    expect(payload._create).not.toHaveBeenCalled()
  })

  it('NO grant when the token is signed with the wrong secret (forge attempt)', async () => {
    process.env.CLAIM_TOKEN_SECRET = 'attacker'
    const forged = signClaim({ kind: 'app', itemId: '7', email: 'a@b.pl' })
    process.env.CLAIM_TOKEN_SECRET = SECRET
    const payload = makePayload()
    const res = await confirmClaim(payload as never, forged)
    expect(res.status).toBe('invalid')
    expect(createDownloadGrant).not.toHaveBeenCalled()
  })

  it('valid app token → records single-use marker FIRST, then DownloadGrant + email', async () => {
    const token = signClaim({ kind: 'app', itemId: '7', email: 'a@b.pl' })
    const payload = makePayload()
    const res = await confirmClaim(payload as never, token)
    expect(res.status).toBe('granted')
    expect(res.kind).toBe('app')
    // single-use marker created with the token
    expect(payload._create).toHaveBeenCalledOnce()
    const createArg = payload._create.mock.calls[0][0]
    expect(createArg.collection).toBe('claim-grants')
    expect(createArg.data.token).toBe(token)
    expect(createArg.data.kind).toBe('app')
    expect(createArg.data.itemId).toBe('7')
    expect(createArg.data.email).toBe('a@b.pl')
    // grant + email
    expect(createDownloadGrant).toHaveBeenCalledOnce()
    expect(createDownloadGrant.mock.calls[0][1]).toMatchObject({ productId: '7', email: 'a@b.pl' })
    expect(sendDownloadLinkEmail).toHaveBeenCalledOnce()
    expect(grantCourseAccess).not.toHaveBeenCalled()
  })

  it('valid course token → purchases grant + set-password email with next=/<slug>', async () => {
    const token = signClaim({ kind: 'course', itemId: '16', email: 'c@d.pl' })
    const payload = makePayload({ product: { id: 16, title: 'Free Course', slug: 'free-course' } })
    const res = await confirmClaim(payload as never, token)
    expect(res.status).toBe('granted')
    expect(res.kind).toBe('course')
    expect(grantCourseAccess).toHaveBeenCalledOnce()
    expect(grantCourseAccess.mock.calls[0][1]).toMatchObject({ programId: '16', email: 'c@d.pl' })
    expect(sendCourseAccessEmail).toHaveBeenCalledOnce()
    const emailArg = sendCourseAccessEmail.mock.calls[0][0]
    expect(emailArg.to).toBe('c@d.pl')
    expect(emailArg.token).toBe('reset-tok')
    expect(emailArg.next).toBe('/free-course')
    expect(createDownloadGrant).not.toHaveBeenCalled()
  })

  it('SINGLE-USE: a re-used token grants NOTHING a second time (dup unique → already-used)', async () => {
    const token = signClaim({ kind: 'app', itemId: '7', email: 'a@b.pl' })
    const payload = makePayload({ duplicate: true })
    const res = await confirmClaim(payload as never, token)
    expect(res.status).toBe('used')
    // the unique-violation on the marker means NO grant + NO email this time
    expect(createDownloadGrant).not.toHaveBeenCalled()
    expect(grantCourseAccess).not.toHaveBeenCalled()
    expect(sendDownloadLinkEmail).not.toHaveBeenCalled()
  })

  it('best-effort email: a failing access email still reports the grant as granted', async () => {
    const token = signClaim({ kind: 'app', itemId: '7', email: 'a@b.pl' })
    sendDownloadLinkEmail.mockRejectedValue(new Error('brevo down'))
    const payload = makePayload()
    const res = await confirmClaim(payload as never, token)
    // grant is durable; the email failure is swallowed
    expect(res.status).toBe('granted')
    expect(createDownloadGrant).toHaveBeenCalledOnce()
  })

  it('marker is written BEFORE the grant (so a crash mid-grant cannot be replayed for a SECOND grant)', async () => {
    const token = signClaim({ kind: 'app', itemId: '7', email: 'a@b.pl' })
    const order: string[] = []
    const payload = makePayload()
    payload._create.mockImplementation(async () => {
      order.push('marker')
      return { id: 1 }
    })
    createDownloadGrant.mockImplementation(async () => {
      order.push('grant')
      return 'dl-tok'
    })
    await confirmClaim(payload as never, token)
    expect(order).toEqual(['marker', 'grant'])
  })
})
