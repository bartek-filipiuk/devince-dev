/**
 * ONE-OFF prod migration reconcile (plan F0.4) — PROD-CRITICAL.
 *
 * Production's DB was built by the OLD Payload `push:true` flow and hand-patched.
 * It already has MOST tables but is MISSING the course-platform objects and has
 * NO `payload_migrations` table. We have just switched to migrations, with
 * baseline `20260610_193458_init` (a full CREATE schema). If migrate.mjs ran the
 * baseline against prod it would fail (most tables already exist).
 *
 * This script reconciles prod so the baseline is recorded as already-applied and
 * the genuinely-missing course objects are created ADDITIVELY:
 *   tables: lessons, _lessons_v, course_assets, stripe_events, users_roles
 *   enums:  enum_lessons_type, enum_lessons_status, enum__lessons_v_version_type,
 *           enum__lessons_v_version_status, enum__lessons_v_published_locale,
 *           enum_users_roles
 *   + their indexes/FKs, and the course relationship columns/indexes/FKs on the
 *     pre-existing payload_locked_documents_rels table.
 *
 * It is STRICTLY ADDITIVE (no drops, no destructive alters) and IDEMPOTENT, so
 * it is safe to run more than once. The whole thing runs in one transaction.
 *
 * After this runs, scripts/migrate.mjs is a no-op on prod and future migrations
 * apply normally.
 *
 * The DDL lives in the sibling `reconcile-prod-migrations.sql`.
 *
 * Usage (point DATABASE_URI at the target DB, e.g. prod over an SSH tunnel):
 *   DATABASE_URI='postgres://USER:PASS@host:5432/DBNAME' \
 *     pnpm tsx scripts/reconcile-prod-migrations.ts
 *
 * TAKE A BACKUP FIRST when running against live prod.
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'

const BASELINE = '20260610_193458_init'

const COURSE_TABLES = [
  'lessons',
  '_lessons_v',
  'course_assets',
  'stripe_events',
  'users_roles',
] as const

async function run() {
  const uri = process.env.DATABASE_URI
  if (!uri) {
    console.error('[reconcile] DATABASE_URI is not set')
    process.exit(1)
  }
  console.log('[reconcile] target:', uri.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'))

  const here = dirname(fileURLToPath(import.meta.url))
  const sql = readFileSync(join(here, 'reconcile-prod-migrations.sql'), 'utf8')

  const client = new Client({ connectionString: uri })
  await client.connect()

  try {
    // Snapshot which course tables exist BEFORE, so we can report what we made.
    const before = await presentTables(client)

    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')

    const after = await presentTables(client)
    const created = COURSE_TABLES.filter((t) => !before.has(t) && after.has(t))
    const already = COURSE_TABLES.filter((t) => before.has(t))

    const baselineRows = await client.query(
      'SELECT count(*)::int AS n FROM public.payload_migrations WHERE name = $1',
      [BASELINE],
    )

    console.log('[reconcile] payload_migrations baseline rows:', baselineRows.rows[0].n)
    console.log(
      '[reconcile] course tables created this run:',
      created.length ? created.join(', ') : '(none — already present)',
    )
    if (already.length) {
      console.log('[reconcile] course tables already present (left untouched):', already.join(', '))
    }
    console.log('[reconcile] done — additive reconcile committed.')
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    await client.end()
  }
}

async function presentTables(client: Client): Promise<Set<string>> {
  const res = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1)`,
    [COURSE_TABLES as unknown as string[]],
  )
  return new Set(res.rows.map((r) => r.tablename))
}

run().catch((err) => {
  console.error('[reconcile] FAILED:', err)
  process.exit(1)
})
