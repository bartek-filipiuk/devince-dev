/**
 * Tests for GET /api/health — Coolify gates rolling updates on it, so a DB
 * failure must surface as 503 and never leak the error to the client.
 */
import { describe, it, expect, vi } from 'vitest'

// Plain function instead of vi.fn(): a vi.fn() that rejects is reported as a
// test error by vitest 4 even when the route catches it.
let execute: () => Promise<unknown> = async () => ({ rows: [] })
vi.mock('payload', () => ({ getPayload: async () => ({ db: { drizzle: { execute: () => execute() } } }) }))
vi.mock('@payload-config', () => ({ default: {} }))

async function get() {
  const { GET } = await import('./route')
  return GET()
}

describe('GET /api/health', () => {
  it('returns 200 when the DB answers', async () => {
    execute = async () => ({ rows: [{ '?column?': 1 }] })
    const res = await get()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('returns 503 without error details when the DB is down', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    execute = async () => {
      throw new Error('connect ECONNREFUSED 10.0.1.5:5432 password=secret')
    }
    const res = await get()
    expect(res.status).toBe(503)
    expect(await res.text()).toBe('{"status":"error"}')
  })
})
