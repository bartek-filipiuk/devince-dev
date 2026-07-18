import { NextRequest, NextResponse } from 'next/server'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ACTIVE_KEY_LIMIT, generateAgentKey } from '@/utilities/agentApiKeys'

async function requireUser() {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await nextHeaders() })
  return { payload, user }
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const name = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).name : undefined
  if (typeof name !== 'string' || !name.trim() || name.length > 100)
    return NextResponse.json({ error: 'Podaj nazwę klucza (do 100 znaków)' }, { status: 400 })

  const { payload, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const active = await payload.find({
    collection: 'agent-api-keys',
    where: { and: [{ user: { equals: user.id } }, { revokedAt: { exists: false } }] },
    limit: 0,
    overrideAccess: true,
    depth: 0,
  })
  if (active.totalDocs >= ACTIVE_KEY_LIMIT)
    return NextResponse.json({ error: `Limit ${ACTIVE_KEY_LIMIT} aktywnych kluczy — najpierw unieważnij któryś` }, { status: 409 })

  const key = generateAgentKey()
  await payload.create({
    collection: 'agent-api-keys',
    data: { user: user.id, name: name.trim(), keyPrefix: key.prefix, keyHash: key.hash },
    overrideAccess: true,
  })
  // plaintext wraca DOKŁADNIE raz — nie jest nigdzie zapisywany
  return NextResponse.json({ ok: true, key: key.plaintext, prefix: key.prefix })
}

export async function DELETE(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const id = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).id : undefined
  if (typeof id !== 'number') return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const { payload, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // BOLA: revoke wyłącznie własnego klucza — filtr po user Z SESJI, nie z body.
  const res = await payload.find({
    collection: 'agent-api-keys',
    where: { and: [{ id: { equals: id } }, { user: { equals: user.id } }] },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })
  const row = res.docs[0]
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await payload.update({
    collection: 'agent-api-keys',
    id: row.id,
    data: { revokedAt: new Date().toISOString() },
    overrideAccess: true,
  })
  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'
