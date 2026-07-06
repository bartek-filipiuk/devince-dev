/**
 * D3 — GET /api/apps/download/[token]: the grant check in the HANDLER is the
 * access control (the middleware PUBLIC_FILE regex deliberately lets dotted
 * tokens through — it is routing, not authz).
 *
 * Attack cases:
 *   (a) forged token (bad HMAC) → 403, DB never queried, FS never touched
 *   (b) well-formed token with no grant → 403, FS never touched
 *   (c) expired grant → 403, no uses increment, FS never touched
 *   (d) traversal in the token (`../`, encoded) → 403, FS never touched
 *   (e) traversal via a poisoned asset filename → 404, FS never touched
 *   (f) happy path → 200 + file streamed from INSIDE private-media-apps/
 *
 * Harness mirrors webhook.test.ts (payload module mock with spies); tokens are
 * signed with the REAL signDownloadToken so the HMAC path is genuinely exercised.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'
import { signDownloadToken } from '@/utilities/downloadToken'

// ── fs mock (hoisted) — the ONLY window to the filesystem ───────────────────

const readFile = vi.fn()

vi.mock('fs/promises', () => ({
  default: { readFile },
  readFile,
}))

// ── payload mock (hoisted) ──────────────────────────────────────────────────

const find = vi.fn()
const findByID = vi.fn()
const update = vi.fn()

const payloadStub = { find, findByID, update }

vi.mock('payload', () => ({
  getPayload: vi.fn(async () => payloadStub),
}))

vi.mock('@payload-config', () => ({ default: Promise.resolve({}) }))

// ── helpers ─────────────────────────────────────────────────────────────────

const SECRET = 'test-download-secret'

function makeArgs(token: string) {
  const req = new Request(`http://localhost/api/apps/download/${encodeURIComponent(token)}`)
  return [req, { params: Promise.resolve({ token }) }] as const
}

const FUTURE = new Date(Date.now() + 86_400_000).toISOString()
const PAST = new Date(Date.now() - 1000).toISOString()

const GRANT_OK = { id: 10, token: 'set-per-test', product: 7, expiresAt: FUTURE, uses: 0, maxUses: 5 }
const PRODUCT_7 = { id: 7, title: 'App', downloadFiles: [42] }
const ASSET_42 = { id: 42, filename: 'app.zip', mimeType: 'application/zip' }

/** Stage the payload stub: grant found for `token`, product + asset resolvable. */
function stageGrant(grant: Record<string, unknown> | null, asset: Record<string, unknown> | null = ASSET_42) {
  find.mockImplementation(async ({ collection }: { collection: string }) => {
    if (collection === 'download-grants') return { docs: grant ? [grant] : [] }
    return { docs: [] }
  })
  findByID.mockImplementation(async ({ collection }: { collection: string }) => {
    if (collection === 'products') return PRODUCT_7
    if (collection === 'app-assets') {
      if (!asset) throw new Error('not found')
      return asset
    }
    throw new Error('not found')
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.DOWNLOAD_TOKEN_SECRET = SECRET
  update.mockResolvedValue({})
  readFile.mockResolvedValue(Buffer.from('FILE-BYTES'))
})

const routePath = '../app/(frontend)/api/apps/download/[token]/route'

describe('download token route — denial paths', () => {
  it('(a) forged token (bad HMAC): 403, DB never queried, FS never touched', async () => {
    const { GET } = await import(routePath)
    stageGrant({ ...GRANT_OK })

    const forged = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.' + 'ab'.repeat(32)
    const res = await GET(...makeArgs(forged))

    expect(res.status).toBe(403)
    expect(find).not.toHaveBeenCalled() // HMAC check runs BEFORE any DB access
    expect(readFile).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('(b) valid HMAC but no grant row: 403, FS never touched', async () => {
    const { GET } = await import(routePath)
    stageGrant(null)

    const token = signDownloadToken({ nonce: 'no-such-grant', secret: SECRET })
    const res = await GET(...makeArgs(token))

    expect(res.status).toBe(403)
    expect(readFile).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('(c) expired grant: 403, no uses increment, FS never touched', async () => {
    const { GET } = await import(routePath)
    const token = signDownloadToken({ nonce: 'expired-grant', secret: SECRET })
    stageGrant({ ...GRANT_OK, token, expiresAt: PAST })

    const res = await GET(...makeArgs(token))

    expect(res.status).toBe(403)
    expect(update).not.toHaveBeenCalled()
    expect(readFile).not.toHaveBeenCalled()
  })

  it('(c2) exhausted grant (uses >= maxUses): 403, FS never touched', async () => {
    const { GET } = await import(routePath)
    const token = signDownloadToken({ nonce: 'used-up-grant', secret: SECRET })
    stageGrant({ ...GRANT_OK, token, uses: 5, maxUses: 5 })

    const res = await GET(...makeArgs(token))

    expect(res.status).toBe(403)
    expect(readFile).not.toHaveBeenCalled()
  })

  it('(d) traversal in the token itself (../ and %2e%2e): 403, FS never touched', async () => {
    const { GET } = await import(routePath)
    stageGrant({ ...GRANT_OK })

    for (const evil of ['../../../etc/passwd', '..%2f..%2f.env', '....//....//secret.zip']) {
      const res = await GET(...makeArgs(evil))
      expect(res.status).toBe(403)
    }
    expect(readFile).not.toHaveBeenCalled()
    expect(find).not.toHaveBeenCalled() // none of them even reach the DB
  })

  it('(e) poisoned asset filename (../../.env): denied, FS never touched', async () => {
    const { GET } = await import(routePath)
    const token = signDownloadToken({ nonce: 'grant-poisoned-asset', secret: SECRET })
    stageGrant({ ...GRANT_OK, token }, { id: 42, filename: '../../.env', mimeType: 'text/plain' })

    const res = await GET(...makeArgs(token))

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(readFile).not.toHaveBeenCalled() // path guard rejects BEFORE any read
  })
})

describe('download token route — happy path', () => {
  it('(f) valid token + live grant: 200, file read from inside private-media-apps/', async () => {
    const { GET } = await import(routePath)
    const token = signDownloadToken({ nonce: 'live-grant', secret: SECRET })
    stageGrant({ ...GRANT_OK, token })

    const res = await GET(...makeArgs(token))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toContain('app.zip')
    // The read stayed inside the private dir.
    expect(readFile).toHaveBeenCalledOnce()
    const readPath = readFile.mock.calls[0][0] as string
    expect(readPath).toContain(`private-media-apps${path.sep}app.zip`)
    expect(readPath).not.toContain('..')
    // Use counter incremented on the grant.
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'download-grants', id: 10, data: { uses: 1 } }),
    )
  })
})
