/**
 * Seed the public Roadmap global with curated PL + EN content.
 *
 * USAGE:  pnpm tsx scripts/seed-roadmap.ts
 *
 * Idempotent: overwrites the global's `items` on every run.
 * Localized two-pass: write PL (creates row ids) → read ids back → write EN by id
 * so EN title/description land on the same rows without wiping PL.
 *
 * Curated PUBLIC content only — VAT invoices intentionally excluded.
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

type Status = 'planned' | 'in_progress' | 'done'
type Track = 'general' | 'apps' | 'courses'

const ITEMS: { status: Status; track: Track; pl: [string, string]; en: [string, string] }[] = [
  // Done
  { status: 'done', track: 'general', pl: ['Płatności BLIK i karta', 'Bezpieczne płatności online, jednorazowo.'], en: ['BLIK & card payments', 'Secure one-time online checkout.'] },
  { status: 'done', track: 'apps', pl: ['Pobieranie po zakupie bez konta', 'Kupujesz, dostajesz podpisany link — bez rejestracji.'], en: ['Account-free downloads', 'Buy, get a signed link — no sign-up.'] },
  { status: 'done', track: 'general', pl: ['Pełne wersje PL i EN', 'Cała platforma dwujęzyczna.'], en: ['Full PL & EN versions', 'The whole platform is bilingual.'] },
  { status: 'done', track: 'apps', pl: ['Progi cenowe Starter/Pro/Agency', 'Wybór licencji na stronie produktu.'], en: ['Starter/Pro/Agency tiers', 'Pick a license on the product page.'] },
  { status: 'done', track: 'courses', pl: ['Czytnik lekcji i postęp', 'Czytelne lekcje z podświetlaniem kodu i śledzeniem postępu.'], en: ['Lesson reader & progress', 'Clean lessons with code highlighting and progress tracking.'] },
  // Planned
  { status: 'planned', track: 'courses', pl: ['„Zapytaj kurs" — AI-asystent', 'Pytania do treści kursu z odpowiedziami na bazie lekcji.'], en: ['"Ask the course" AI tutor', "Ask questions answered from the course's own lessons."] },
  { status: 'planned', track: 'apps', pl: ['„Zapytaj produkt" — czat przedsprzedażowy', 'Odpowiedzi o produkcie wprost na jego stronie.'], en: ['"Ask the product" pre-sale chat', 'Answers about the product, right on its page.'] },
  { status: 'planned', track: 'courses', pl: ['Certyfikaty ukończenia', 'Weryfikowalny certyfikat po ukończeniu kursu.'], en: ['Completion certificates', 'A verifiable certificate when you finish.'] },
  { status: 'planned', track: 'courses', pl: ['Maile przypominające o postępie', 'Delikatne przypomnienia, żeby dokończyć kurs.'], en: ['Progress nudge emails', 'Gentle reminders to finish the course.'] },
  { status: 'planned', track: 'apps', pl: ['Order bumps przy zakupie', 'Powiązane produkty w jednym checkoutcie.'], en: ['Checkout order bumps', 'Related products in a single checkout.'] },
  { status: 'planned', track: 'apps', pl: ['Kup raz, dostajesz aktualizacje', 'Nowe wersje produktu do ponownego pobrania.'], en: ['Buy once, get updates', 'Re-download new versions of your product.'] },
  { status: 'planned', track: 'apps', pl: ['Opinie zweryfikowanych kupujących', 'Recenzje od osób, które faktycznie kupiły.'], en: ['Verified-buyer reviews', 'Reviews from people who actually bought.'] },
  { status: 'planned', track: 'apps', pl: ['Strony produktów: screeny i lista funkcji', 'Galeria zrzutów i przejrzysty spis możliwości.'], en: ['Product pages: screenshots & features', 'A screenshot gallery and a clear feature list.'] },
]

async function main() {
  console.log('=== seed-roadmap ===')
  const payload = await getPayload({ config: configPromise })

  // Pass 1 — write PL (creates row ids, sets status/track + PL text).
  await payload.updateGlobal({
    slug: 'roadmap',
    locale: 'pl',
    data: {
      items: ITEMS.map((it) => ({
        status: it.status,
        track: it.track,
        title: it.pl[0],
        description: it.pl[1],
      })),
    } as never,
  })

  // Read ids back (PL locale), then write EN by id so EN text lands on the same rows.
  const plDoc = await payload.findGlobal({ slug: 'roadmap', locale: 'pl', depth: 0 })
  const rows = Array.isArray(plDoc.items) ? plDoc.items : []
  if (rows.length !== ITEMS.length) {
    throw new Error(`expected ${ITEMS.length} rows after PL write, got ${rows.length}`)
  }

  // Pass 2 — write EN by id (carry status/track + ids forward).
  await payload.updateGlobal({
    slug: 'roadmap',
    locale: 'en',
    data: {
      items: rows.map((row, i) => ({
        id: row.id,
        status: ITEMS[i].status,
        track: ITEMS[i].track,
        title: ITEMS[i].en[0],
        description: ITEMS[i].en[1],
      })),
    } as never,
  })

  console.log(`Seeded ${ITEMS.length} roadmap items (PL + EN).`)
  process.exit(0)
}

main().catch((err) => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
