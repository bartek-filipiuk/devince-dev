/**
 * Seed danych testowych trybu kohortowego (lokalny dev DB).
 * Uruchomienie: pnpm tsx <ścieżka>/seed-cohort-test.ts
 */
import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

const SLUG = 'test-kohorta'

async function run() {
  const payload = await getPayload({ config: configPromise })

  let program = (
    await payload.find({ collection: 'program', where: { slug: { equals: SLUG } }, limit: 1, overrideAccess: true })
  ).docs[0]
  if (!program) {
    program = await payload.create({
      collection: 'program',
      draft: false,
      overrideAccess: true,
      context: { disableRevalidate: true },
      data: {
        title: 'Test Kohorta 10',
        slug: SLUG,
        type: 'course',
        pricing: 'paid',
        priceCents: 10000,
        currency: 'pln',
        deliveryMode: 'cohort',
        cohortConfig: {
          programLength: 10,
          unlockHour: 6,
          timezone: 'Europe/Warsaw',
          minimumLabel: 'Zrobiłem dzisiejsze minimum',
          checkinFields: [
            {
              key: 'trainingType',
              label: 'Trening',
              fieldType: 'select',
              options: [
                { value: 'sila_A', label: 'Siła A' },
                { value: 'sila_B', label: 'Siła B' },
                { value: 'cardio', label: 'Cardio' },
              ],
              section: 'Dzień',
            },
            { key: 'steps', label: 'Kroki', fieldType: 'number', min: 0, max: 100000, section: 'Dzień' },
            { key: 'sleepH', label: 'Sen (h)', fieldType: 'number', min: 0, max: 24, section: 'Regeneracja' },
          ],
          measurementPoints: [
            { key: 'D0', label: 'D0' },
            { key: 'D10', label: 'D10' },
          ],
          measurementMetrics: [
            { key: 'weightKg', label: 'Waga', unit: 'kg', min: 30, max: 300 },
            { key: 'pushups', label: 'Pompki max', min: 0, max: 200 },
          ],
          completion: {
            minimumDaysTarget: 8,
            extraTargets: [
              { label: 'Sesje siłowe', fieldKey: 'trainingType', matchValues: ['sila_A', 'sila_B'], target: 3 },
            ],
          },
        },
        _status: 'published',
      } as never,
    })
    console.log('program created', program.id)
  } else console.log('program exists', program.id)

  for (let nr = 1; nr <= 10; nr++) {
    const slug = `dzien-${nr}`
    const exists = await payload.find({
      collection: 'lessons',
      where: { and: [{ program: { equals: program.id } }, { slug: { equals: slug } }] },
      limit: 1,
      overrideAccess: true,
    })
    if (exists.docs.length) continue
    await payload.create({
      collection: 'lessons',
      draft: false,
      overrideAccess: true,
      context: { disableRevalidate: true },
      data: {
        title: `Dzień ${nr}: lekcja testowa`,
        slug,
        program: program.id,
        nr,
        order: nr,
        type: 'text',
        why: `Po co jest dzień ${nr} — test dripu.`,
        what: `Zadanie dnia ${nr}.`,
        dod: `Zrobione minimum dnia ${nr}.`,
        _status: 'published',
      } as never,
    })
  }
  console.log('lessons ok')

  // kohorta wystartowała 3 dni temu → dziś = dzień 4, odblokowane 1..4
  const start = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10)
  let cohort = (
    await payload.find({ collection: 'cohorts', where: { program: { equals: program.id } }, limit: 1, overrideAccess: true })
  ).docs[0]
  if (!cohort) {
    cohort = await payload.create({
      collection: 'cohorts',
      overrideAccess: true,
      data: { name: 'Kohorta testowa 1', program: program.id, startDate: start },
    })
    console.log('cohort created', cohort.id, start)
  } else console.log('cohort exists', cohort.id, cohort.startDate)

  const email = 'kursant@test.dev'
  let user = (
    await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
  ).docs[0]
  if (!user) {
    user = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: { email, password: 'test-kursant-123', name: 'Kursant Testowy', roles: ['customer'], purchases: [program.id] } as never,
    })
    console.log('user created', user.id)
  } else console.log('user exists', user.id)

  const member = await payload.find({
    collection: 'cohort-members',
    where: { and: [{ user: { equals: user.id } }, { program: { equals: program.id } }] },
    limit: 1,
    overrideAccess: true,
  })
  if (!member.docs.length) {
    await payload.create({
      collection: 'cohort-members',
      overrideAccess: true,
      data: { user: user.id, cohort: cohort.id, program: program.id, joinedAt: new Date().toISOString() },
    })
    console.log('membership created')
  } else console.log('membership exists')

  console.log('SEED DONE — login kursant@test.dev / test-kursant-123, kurs /test-kohorta (dziś = dzień 4)')
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
