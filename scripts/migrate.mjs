import nextEnv from '@next/env'

// Load .env / .env.local / .env.production the same way Next.js (and the
// Payload CLI) do, so PAYLOAD_SECRET / DATABASE_URI are available when this
// runs as a standalone boot-time script (e.g. container start command).
// Must run BEFORE importing the Payload config, since the config reads
// process.env at module-evaluation time — hence the dynamic imports below.
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production')

const run = async () => {
  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')
  const payload = await getPayload({ config })
  await payload.db.migrate()
  console.log('[migrate] migrations up to date')
  process.exit(0)
}
run().catch((e) => {
  console.error('[migrate] FAILED', e)
  process.exit(1)
})
