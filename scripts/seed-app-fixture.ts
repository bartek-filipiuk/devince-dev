/**
 * Smoke fixture seed for apps.devince.dev.
 *
 * USAGE:
 *   pnpm tsx scripts/seed-app-fixture.ts
 *
 * Requires DOWNLOAD_TOKEN_SECRET in .env (loaded automatically via dotenv/config).
 *
 * Idempotent: running twice reuses the same asset / product / grant and prints
 * the same token.
 *
 * Output:
 *   FIXTURE TOKEN: <token>
 *   FIXTURE PRODUCT: aplikacja-testowa
 */
import 'dotenv/config'
import fs from 'fs'

import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { createDownloadToken } from '../src/utilities/downloadToken'

// ---------------------------------------------------------------------------
// Minimal Lexical rich-text builder
// ---------------------------------------------------------------------------

function makeParagraph(text: string): object {
  return {
    type: 'paragraph',
    children: [
      {
        type: 'text',
        detail: 0,
        format: 0,
        mode: 'normal',
        style: '',
        text,
        version: 1,
      },
    ],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  }
}

function makeRichText(text: string): object {
  return {
    root: {
      type: 'root',
      children: [makeParagraph(text)],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== seed-app-fixture ===')

  const secret = process.env.DOWNLOAD_TOKEN_SECRET
  if (!secret) {
    console.error('FATAL: DOWNLOAD_TOKEN_SECRET is not set.')
    process.exit(1)
  }

  // 1. Init Payload ----------------------------------------------------------
  const payload = await getPayload({ config: configPromise })

  // 2. Write fixture file to /tmp -------------------------------------------
  const FIXTURE_PATH = '/tmp/devince-fixture.txt'
  fs.writeFileSync(FIXTURE_PATH, 'devince apps fixture v1\n')
  console.log(`Wrote fixture file: ${FIXTURE_PATH}`)

  // 3. App asset (idempotent by filename / alt) ------------------------------
  const existingAssets = await payload.find({
    collection: 'app-assets',
    where: { filename: { equals: 'devince-fixture.txt' } },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })

  let assetId: number | string

  if (existingAssets.docs[0]) {
    assetId = existingAssets.docs[0].id
    console.log(`Asset exists: devince-fixture.txt (id ${assetId})`)
  } else {
    // Also check by alt in case Payload renamed the file on a previous collision
    const byAlt = await payload.find({
      collection: 'app-assets',
      where: { alt: { equals: 'fixture' } },
      limit: 1,
      overrideAccess: true,
      depth: 0,
    })

    if (byAlt.docs[0]) {
      assetId = byAlt.docs[0].id
      console.log(`Asset exists (matched by alt=fixture): id ${assetId}`)
    } else {
      const fileBuffer = fs.readFileSync(FIXTURE_PATH)
      const created = await payload.create({
        collection: 'app-assets',
        data: { alt: 'fixture' },
        file: {
          data: fileBuffer,
          name: 'devince-fixture.txt',
          mimetype: 'text/plain',
          size: fileBuffer.byteLength,
        },
        overrideAccess: true,
      })
      assetId = created.id
      console.log(`Uploaded asset: devince-fixture.txt (id ${assetId})`)
    }
  }

  // 4. Product (idempotent by slug) ------------------------------------------
  const existingProducts = await payload.find({
    collection: 'products',
    where: { slug: { equals: 'aplikacja-testowa' } },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })

  let productId: number | string

  if (existingProducts.docs[0]) {
    productId = existingProducts.docs[0].id
    console.log(`Product exists: aplikacja-testowa (id ${productId})`)
  } else {
    const created = await payload.create({
      collection: 'products',
      draft: false,
      data: {
        title: 'Aplikacja testowa',
        slug: 'aplikacja-testowa',
        priceCents: 4900,
        currency: 'pln',
        downloadFiles: [assetId],
        description: makeRichText('Testowy produkt do smoke testów.'),
        _status: 'published',
      } as never,
      overrideAccess: true,
    })
    productId = created.id
    console.log(`Created product: aplikacja-testowa (id ${productId})`)
  }

  // 5. Download grant (idempotent by stripeSessionId) ------------------------
  const existingGrants = await payload.find({
    collection: 'download-grants',
    where: { stripeSessionId: { equals: 'cs_fixture' } },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })

  let token: string

  if (existingGrants.docs[0]) {
    token = existingGrants.docs[0].token
    console.log(`Grant exists (stripeSessionId=cs_fixture, id ${existingGrants.docs[0].id})`)
  } else {
    token = createDownloadToken(secret)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const created = await payload.create({
      collection: 'download-grants',
      data: {
        token,
        product: productId,
        email: 'fixture@devince.dev',
        expiresAt,
        maxUses: 5,
        uses: 0,
        stripeSessionId: 'cs_fixture',
      },
      overrideAccess: true,
    })
    console.log(`Created grant (id ${created.id}), expires ${expiresAt}`)
  }

  // 6. Print results ---------------------------------------------------------
  console.log('\nFIXTURE TOKEN: ' + token)
  console.log('FIXTURE PRODUCT: aplikacja-testowa')

  process.exit(0)
}

main().catch((err) => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
