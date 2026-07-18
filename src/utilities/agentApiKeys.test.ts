import { describe, expect, it, vi } from 'vitest'
import { AGENT_KEY_RE, generateAgentKey, hashAgentKey, verifyAgentKey } from './agentApiKeys'

describe('generateAgentKey', () => {
  it('format dvc_ + 40 base62, prefix 12 znaków, hash = sha256(plaintext)', () => {
    const k = generateAgentKey()
    expect(k.plaintext).toMatch(AGENT_KEY_RE)
    expect(k.prefix).toBe(k.plaintext.slice(0, 12))
    expect(k.hash).toBe(hashAgentKey(k.plaintext))
    expect(k.hash).toMatch(/^[0-9a-f]{64}$/)
  })
  it('klucze są unikalne', () => {
    expect(generateAgentKey().plaintext).not.toBe(generateAgentKey().plaintext)
  })
})

describe('verifyAgentKey', () => {
  const key = generateAgentKey()
  const row = { id: 1, user: { id: 9, roles: ['customer'] }, keyHash: key.hash, revokedAt: null }
  const mk = (docs: unknown[]) => ({
    find: vi.fn(async () => ({ docs })),
    update: vi.fn(async () => ({})),
  })
  it('poprawny klucz → user; zły format / revoked / brak → null', async () => {
    expect(await verifyAgentKey(mk([row]) as never, key.plaintext)).toMatchObject({ id: 9 })
    expect(await verifyAgentKey(mk([row]) as never, 'nie-klucz')).toBeNull()
    expect(await verifyAgentKey(mk([{ ...row, revokedAt: '2026-01-01' }]) as never, key.plaintext)).toBeNull()
    expect(await verifyAgentKey(mk([]) as never, key.plaintext)).toBeNull()
  })
})
