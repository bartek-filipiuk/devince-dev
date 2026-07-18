import { NextRequest, NextResponse } from 'next/server'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { resolveCohortContext, saveCheckinAction } from '@/utilities/cohortActions'

// Cienki wrapper HTTP nad saveCheckinAction. Uwaga na semantykę: upsert
// check-inu jest FULL-REPLACE — klient MUSI słać komplet (note + values);
// częściowy zapis kasuje pominięte pola. Route tylko przekazuje payload.
export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null)
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  const { programSlug, date, minimumDone, note, values } = body as Record<string, unknown>
  if (
    typeof programSlug !== 'string' ||
    typeof date !== 'string' ||
    typeof minimumDone !== 'boolean' ||
    (note !== undefined && typeof note !== 'string')
  )
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await nextHeaders() })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // userId ZAWSZE z sesji (`user`), nigdy z body — granica BOLA.
  const ctx = await resolveCohortContext(payload, user, programSlug)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

  const result = await saveCheckinAction(payload, user, ctx, { date, minimumDone, note, values })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
}

export const dynamic = 'force-dynamic'
