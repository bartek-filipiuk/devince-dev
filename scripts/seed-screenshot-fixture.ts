/**
 * Attach 2 demo screenshots to the fixture product `aplikacja-testowa` so the
 * gallery can be smoke-tested locally. Idempotent: re-uploads + overwrites the
 * product's screenshots each run. Uses disableRevalidate (revalidatePath can't
 * run from a standalone script).
 *
 * USAGE: pnpm tsx scripts/seed-screenshot-fixture.ts
 */
import 'dotenv/config'
import fs from 'fs'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

// One known-good 1x1 PNG, reused for both demo shots — a smoke fixture only needs
// the grid to render two cards, not distinct images.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

async function uploadMedia(payload: any, name: string, data: Buffer, alt: string): Promise<number> {
  const created = await payload.create({
    collection: 'media',
    data: { alt },
    file: { data, name, mimetype: 'image/png', size: data.byteLength },
    overrideAccess: true,
  })
  return created.id
}

async function main() {
  const payload = await getPayload({ config: configPromise })
  const found = await payload.find({
    collection: 'products',
    where: { slug: { equals: 'aplikacja-testowa' } },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })
  const product = found.docs[0]
  if (!product) throw new Error('fixture product aplikacja-testowa not found — run seed-app-fixture.ts first')

  const id1 = await uploadMedia(payload, 'shot-one.png', PNG_1x1, 'Demo screenshot one')
  const id2 = await uploadMedia(payload, 'shot-two.png', PNG_1x1, 'Demo screenshot two')

  await payload.update({
    collection: 'products',
    id: product.id,
    overrideAccess: true,
    context: { disableRevalidate: true },
    data: {
      screenshots: [
        { image: id1, caption: 'Storefront' },
        { image: id2, caption: 'Admin dashboard' },
      ],
    } as never,
  })
  console.log('Attached 2 screenshots to aplikacja-testowa.')
  process.exit(0)
}

main().catch((e) => {
  console.error('FATAL:', e?.message || e)
  process.exit(1)
})
