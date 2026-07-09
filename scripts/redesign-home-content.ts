/**
 * Jednorazowo: homepage (slug 'home') przechodzi na BuildLogHero + warianty Features.
 * - glassHero → buildLogHero (przenosi headline/CTA; subheadline→lede, oba pola richText Lexical)
 * - features "Trzy wejścia" → variant 'ledger'
 * - features "Dla kogo to jest" → variant 'columns'
 * Uruchomienie: pnpm tsx scripts/redesign-home-content.ts (wymaga lokalnej bazy)
 */
import 'dotenv/config'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

const LOCALES = ['pl', 'en'] as const

async function run() {
  const payload = await getPayload({ config: configPromise })

  for (const locale of LOCALES) {
    const pages = await payload.find({
      collection: 'pages',
      where: { slug: { equals: 'home' } },
      locale,
      depth: 0,
      limit: 1,
    })
    const home = pages.docs[0]
    if (!home) {
      console.error(`[${locale}] brak strony home`)
      continue
    }

    // ponytail: no explicit param type here — `home.layout` is Payload's
    // discriminated block union, so narrowing on `blockType` gives typed
    // field access below without a cast (the brief's Record<string,unknown>
    // + `as never as {...}` cast doesn't type-check under `pnpm build`).
    const layout = (home.layout ?? []).map((block) => {
      if (block.blockType === 'glassHero') {
        const { headline, subheadline, primaryCTA, secondaryCTA } = block
        return {
          blockType: 'buildLogHero' as const,
          headline,
          lede: subheadline,
          primaryCTA,
          secondaryCTA,
          showLog: true,
          showStats: true,
        }
      }
      if (block.blockType === 'features') {
        const title = String(block.sectionTitle ?? '')
        if (/wejści|entrance/i.test(title)) return { ...block, variant: 'ledger' as const }
        if (/dla kogo|who/i.test(title)) return { ...block, variant: 'columns' as const }
      }
      return block
    })

    await payload.update({
      collection: 'pages',
      id: home.id,
      data: { layout },
      locale,
      // ponytail: standalone tsx run has no Next.js request store, so the
      // afterChange revalidatePath() hook throws outside a real request;
      // skip it here, the dev server picks up fresh data on next request anyway.
      context: { disableRevalidate: true },
    })
    console.log(`[${locale}] home zaktualizowane (${layout.length} bloków)`)
  }
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
