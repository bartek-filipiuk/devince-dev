import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getLocale } from '@/utilities/getLocale.server'
import { getLocalizedPath } from '@/utilities/getLocale'
import { AgentKeysPanel } from './AgentKeysPanel'

export const dynamic = 'force-dynamic'

export default async function AgentPage() {
  const locale = await getLocale()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    redirect(
      `${getLocalizedPath('/login', locale)}?next=${encodeURIComponent(
        getLocalizedPath('/account/agent', locale),
      )}`,
    )
  }

  const res = await payload.find({
    collection: 'agent-api-keys',
    where: { user: { equals: user.id } },
    sort: '-createdAt',
    limit: 50,
    overrideAccess: true,
    depth: 0,
  })
  const keys = res.docs.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.keyPrefix,
    createdAt: String(k.createdAt ?? ''),
    revoked: !!k.revokedAt,
  }))
  const mcpUrl = `${process.env.NEXT_PUBLIC_COURSES_URL ?? ''}/api/agent/mcp`

  return (
    <section className="shell auth-shell">
      <header className="auth-account-head">
        <div>
          <span className="eyebrow">
            <i>Agent</i>
          </span>
          <h1 className="section-title">Agent (MCP)</h1>
        </div>
      </header>
      <p className="store-empty" style={{ marginBottom: '1.5rem' }}>
        Podepnij Claude Code lub Codex do swojego kursu: agent pobierze plan dnia (tytuł, zadanie,
        definition-of-done) i zapisze check-in/pomiary za Ciebie.
      </p>
      <AgentKeysPanel keys={keys} mcpUrl={mcpUrl} />
    </section>
  )
}
