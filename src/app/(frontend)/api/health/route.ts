// Health check for Coolify rolling updates: the new container only replaces the
// old one once this returns 200. Pings the DB so a deploy with a broken
// DATABASE_URI or unreachable Postgres is rejected instead of going live.
// Public on purpose; the body never carries error details.
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { sql } from '@payloadcms/db-postgres'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const payload = await getPayload({ config: configPromise })
    await payload.db.drizzle.execute(sql`SELECT 1`)
    return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[health] check failed', err)
    return NextResponse.json({ status: 'error' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
