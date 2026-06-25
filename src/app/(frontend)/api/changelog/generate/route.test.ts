/**
 * Gate + wiring tests for the deploy-triggered changelog endpoint. The orchestrator
 * and Payload are mocked — the heavy GitHub/Claude/DB IO is covered by their own
 * unit tests; here we assert the secret gate and that an authed request invokes the
 * orchestrator and 200s.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('payload', () => ({ getPayload: vi.fn().mockResolvedValue({}) }))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('@/utilities/changelogGenerate', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/utilities/changelogGenerate')>()
  return { ...original, runChangelogGenerate: vi.fn() }
})

const SECRET = 'changelog-secret-32-chars-long!!!'

function req(url: string): NextRequest {
  return new NextRequest(url, { method: 'POST', headers: { 'content-type': 'application/json' } })
}

describe('POST /api/changelog/generate', () => {
  beforeEach(() => {
    process.env.CHANGELOG_WEBHOOK_SECRET = SECRET
    vi.clearAllMocks()
  })

  it('401s without a secret', async () => {
    const { runChangelogGenerate } = await import('@/utilities/changelogGenerate')
    const { POST } = await import('./route.js')
    const res = await POST(req('http://localhost/api/changelog/generate'))
    expect(res.status).toBe(401)
    expect(runChangelogGenerate).not.toHaveBeenCalled()
  })

  it('401s with a wrong secret', async () => {
    const { runChangelogGenerate } = await import('@/utilities/changelogGenerate')
    const { POST } = await import('./route.js')
    const res = await POST(req('http://localhost/api/changelog/generate?secret=nope'))
    expect(res.status).toBe(401)
    expect(runChangelogGenerate).not.toHaveBeenCalled()
  })

  it('runs the orchestrator and 200s with a valid secret', async () => {
    const { runChangelogGenerate } = await import('@/utilities/changelogGenerate')
    vi.mocked(runChangelogGenerate).mockResolvedValue({ created: true, entryId: 'e1', prCount: 2, notes: [] })

    const { POST } = await import('./route.js')
    const res = await POST(req(`http://localhost/api/changelog/generate?secret=${SECRET}`))
    expect(res.status).toBe(200)
    expect(runChangelogGenerate).toHaveBeenCalledOnce()
    expect((await res.json()).data).toMatchObject({ created: true, prCount: 2 })
  })
})
