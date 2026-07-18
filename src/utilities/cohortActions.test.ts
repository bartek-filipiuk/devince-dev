import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { completeLessonAction, saveCheckinAction, type CohortContext } from './cohortActions'

// Minimalny fake Payload Local API: kolekcje w Mapach, find po where equals.
function fakePayload() {
  const rows: Record<string, Record<string, unknown>[]> = {
    checkins: [],
    'lesson-progress': [],
    lessons: [{ id: 100, program: 7, nr: 5, slug: 'dzien-5' }],
  }
  let nextId = 1000
  return {
    rows,
    find: vi.fn(async ({ collection, where }: { collection: string; where?: unknown }) => {
      const all = rows[collection] ?? []
      const w = JSON.stringify(where ?? {})
      const docs = all.filter((r) => {
        // wystarczające dla testów: dopasuj wszystkie pary equals z where
        const eqs = [...w.matchAll(/"(\w+)":\{"equals":("?[^"}]*"?)\}/g)]
        return eqs.every(([, k, v]) => String(r[k]) === JSON.parse(v.startsWith('"') ? v : `"${v}"`).toString())
      })
      return { docs, totalDocs: docs.length }
    }),
    create: vi.fn(async ({ collection, data }: { collection: string; data: Record<string, unknown> }) => {
      // symulacja unikalnych indeksów: (user,program,date) i (user,lesson)
      const dupCheckin =
        collection === 'checkins' &&
        rows.checkins.some((r) => r.user === data.user && r.program === data.program && r.date === data.date)
      const dupProgress =
        collection === 'lesson-progress' &&
        rows['lesson-progress'].some((r) => r.user === data.user && r.lesson === data.lesson)
      if (dupCheckin || dupProgress) throw new Error('duplicate key')
      const doc = { id: nextId++, ...data }
      rows[collection].push(doc)
      return doc
    }),
    update: vi.fn(async ({ collection, id, data }: { collection: string; id: number; data: Record<string, unknown> }) => {
      const row = rows[collection].find((r) => r.id === id)
      Object.assign(row ?? {}, data)
      return row
    }),
  }
}

const ctx = (over: Partial<CohortContext> = {}): CohortContext =>
  ({
    program: {
      id: 7,
      deliveryMode: 'cohort',
      cohortConfig: {
        programLength: 60,
        unlockHour: 6,
        timezone: 'Europe/Warsaw',
        checkinFields: [{ key: 'steps', fieldType: 'number', min: 0, max: 100000 }],
        completion: { minimumDaysTarget: 48 },
      },
    },
    cohort: { id: 2, startDate: '2026-07-01' },
    clock: { startDate: '2026-07-01', unlockHour: 6, timezone: 'Europe/Warsaw', programLength: 60 },
    isAdmin: false,
    ...over,
  }) as never

const user = { id: 1, roles: ['customer'] } as never

afterEach(() => vi.useRealTimers())

describe('saveCheckinAction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-05T12:00:00Z')) // dzień 5, po 6:00
  })

  it('zapisuje dzisiejszy check-in, auto-ukańcza lekcję dnia, zwraca streak', async () => {
    const p = fakePayload()
    const res = await saveCheckinAction(p as never, user, ctx(), {
      date: '2026-07-05',
      minimumDone: true,
      values: { steps: 9000 },
    })
    expect(res).toMatchObject({ ok: true, streak: 1, programDay: 5 })
    expect(p.rows.checkins).toHaveLength(1)
    expect(p.rows['lesson-progress']).toHaveLength(1) // lekcja nr 5 auto-ukończona
  })

  it('odrzuca dzień poza oknem dziś/wczoraj', async () => {
    const res = await saveCheckinAction(fakePayload() as never, user, ctx(), {
      date: '2026-07-01',
      minimumDone: true,
    })
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('wczorajszy backfill NIE auto-ukańcza lekcji', async () => {
    const p = fakePayload()
    const res = await saveCheckinAction(p as never, user, ctx(), { date: '2026-07-04', minimumDone: true })
    expect(res).toMatchObject({ ok: true })
    expect(p.rows['lesson-progress']).toHaveLength(0)
  })

  it('drugi zapis tego samego dnia to update (upsert), nie duplikat', async () => {
    const p = fakePayload()
    await saveCheckinAction(p as never, user, ctx(), { date: '2026-07-05', minimumDone: false })
    await saveCheckinAction(p as never, user, ctx(), { date: '2026-07-05', minimumDone: true })
    expect(p.rows.checkins).toHaveLength(1)
    expect(p.rows.checkins[0].minimumDone).toBe(true)
  })

  it('odrzuca check-in przed startem programu (dzień < 1)', async () => {
    vi.setSystemTime(new Date('2026-06-30T12:00:00Z')) // dzień 0 — kohorta startuje 2026-07-01
    const res = await saveCheckinAction(fakePayload() as never, user, ctx(), {
      date: '2026-06-30',
      minimumDone: true,
    })
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('odrzuca check-in po końcu programu (dzień > programLength)', async () => {
    const short = ctx({ clock: { startDate: '2026-07-01', unlockHour: 6, timezone: 'Europe/Warsaw', programLength: 3 } })
    const res = await saveCheckinAction(fakePayload() as never, user, short, {
      date: '2026-07-05', // dzień 5 przy programLength 3
      minimumDone: true,
    })
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('odrzuca values niezgodne z configiem', async () => {
    const res = await saveCheckinAction(fakePayload() as never, user, ctx(), {
      date: '2026-07-05',
      minimumDone: true,
      values: { hack: 1 },
    })
    expect(res).toMatchObject({ ok: false, status: 400 })
  })
})

describe('completeLessonAction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-05T12:00:00Z'))
  })

  it('ukańcza odblokowaną lekcję; zablokowaną odrzuca; admin omija', async () => {
    const p = fakePayload()
    expect(await completeLessonAction(p as never, user, ctx(), 5)).toMatchObject({ ok: true })
    expect(await completeLessonAction(p as never, user, ctx(), 6)).toMatchObject({ ok: false, status: 403 })
    p.rows.lessons.push({ id: 101, program: 7, nr: 6, slug: 'dzien-6' })
    expect(await completeLessonAction(p as never, user, ctx({ isAdmin: true }), 6)).toMatchObject({ ok: true })
  })

  it('idempotentne przy podwójnym wywołaniu', async () => {
    const p = fakePayload()
    await completeLessonAction(p as never, user, ctx(), 5)
    expect(await completeLessonAction(p as never, user, ctx(), 5)).toMatchObject({ ok: true })
    expect(p.rows['lesson-progress']).toHaveLength(1)
  })
})
