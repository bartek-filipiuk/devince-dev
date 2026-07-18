// Klucze MCP uczestnika: plaintext pokazywany RAZ, w DB tylko SHA-256 + prefix.
import { createHash, randomBytes } from 'crypto'
import type { BasePayload } from 'payload'
import type { User } from '@/payload-types'

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
export const AGENT_KEY_RE = /^dvc_[0-9A-Za-z]{40}$/
export const ACTIVE_KEY_LIMIT = 5

export function hashAgentKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

export function generateAgentKey(): { plaintext: string; prefix: string; hash: string } {
  const bytes = randomBytes(40)
  let body = ''
  for (const b of bytes) body += CHARSET[b % 62]
  const plaintext = `dvc_${body}`
  return { plaintext, prefix: plaintext.slice(0, 12), hash: hashAgentKey(plaintext) }
}

// Bearer → user. Fail-closed: zły format / brak / revoked → null.
export async function verifyAgentKey(payload: BasePayload, bearer: string): Promise<User | null> {
  if (!AGENT_KEY_RE.test(bearer)) return null
  const res = await payload.find({
    collection: 'agent-api-keys',
    where: { keyHash: { equals: hashAgentKey(bearer) } },
    limit: 1,
    depth: 1, // populate user
    overrideAccess: true,
  })
  const row = res.docs[0]
  if (!row || row.revokedAt) return null
  const user = typeof row.user === 'object' && row.user ? (row.user as User) : null
  if (!user) return null
  // telemetria fire-and-forget — błąd nie może zablokować auth
  void payload
    .update({ collection: 'agent-api-keys', id: row.id, data: { lastUsedAt: new Date().toISOString() }, overrideAccess: true })
    .catch(() => {})
  return user
}
