// Logika domenowa trybu kohortowego — JEDYNE miejsce z regułami zapisu.
// Konsumenci: route'y HTTP (/api/courses/*) i narzędzia MCP uczestnika.
// Każda funkcja bierze `user` z sesji/klucza (BOLA) — nigdy z inputu.
import type { BasePayload } from 'payload'
import type { Checkin, Cohort, CourseMeasurement, Lesson, Program, User } from '@/payload-types'
import { clockFor, cohortMembership } from './cohortClock'
import {
  canWriteCheckin,
  isUnlocked,
  programDay as programDayOf,
  todayInTz,
  unlockAt,
  yesterdayInTz,
  type CohortClock,
} from './cohortUnlock'
import { completionStatus, minimumStreak, type CheckinRow } from './cohortProgress'
import { validateCheckinValues, validateMeasurementValues, type FieldDef, type MetricDef } from './checkinValues'
import { isEnrolled } from './courseProgress'

export type CohortContext = { program: Program; cohort: Cohort; clock: CohortClock; isAdmin: boolean }
type Fail = { ok: false; error: string; status: number }
const forbidden: Fail = { ok: false, error: 'forbidden', status: 403 }

export async function resolveCohortContext(
  payload: BasePayload,
  user: User,
  programSlug: string,
): Promise<CohortContext | Fail> {
  const res = await payload.find({
    collection: 'program',
    where: { slug: { equals: programSlug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const program = res.docs[0]
  if (!program || program.deliveryMode !== 'cohort') return forbidden
  const isAdmin = Array.isArray(user.roles) && user.roles.includes('admin')
  if (!isAdmin && !isEnrolled(user, program.id)) return forbidden
  const membership = await cohortMembership(payload, user.id, program.id)
  if (!membership) return { ok: false, error: 'Brak przypisanej kohorty — poproś o przypisanie', status: 409 }
  const clock = clockFor(program, membership.cohort)
  if (!clock) return forbidden // niekompletna konfiguracja → fail-closed
  return { program, cohort: membership.cohort, clock, isAdmin }
}

async function findLessonByDay(payload: BasePayload, programId: number, day: number): Promise<Lesson | null> {
  const res = await payload.find({
    collection: 'lessons',
    where: { and: [{ program: { equals: programId } }, { nr: { equals: day } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return (res.docs[0] as Lesson) ?? null
}

// Idempotentny wpis ukończenia (unikalny indeks user+lesson łapie wyścig).
async function upsertCompletion(payload: BasePayload, userId: number, lesson: Lesson, programId: number) {
  try {
    await payload.create({
      collection: 'lesson-progress',
      data: { user: userId, lesson: lesson.id, program: programId, completedAt: new Date().toISOString() },
      overrideAccess: true,
    })
  } catch {
    // duplikat (user, lesson) → już ukończona — no-op
  }
}

async function userCheckins(payload: BasePayload, userId: number, programId: number): Promise<Checkin[]> {
  const res = await payload.find({
    collection: 'checkins',
    where: { and: [{ user: { equals: userId } }, { program: { equals: programId } }] },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })
  return res.docs as Checkin[]
}

const asRows = (checkins: Checkin[]): CheckinRow[] =>
  checkins.map((c) => ({ date: c.date, minimumDone: !!c.minimumDone, values: (c.values as never) ?? {} }))

export async function saveCheckinAction(
  payload: BasePayload,
  user: User,
  ctx: CohortContext,
  input: { date: string; minimumDone: boolean; note?: string; values?: unknown },
): Promise<{ ok: true; streak: number; programDay: number } | Fail> {
  const { clock, program } = ctx
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(input.date)))
    return { ok: false, error: 'Nieprawidłowa data', status: 400 }
  if (!canWriteCheckin(input.date, clock))
    return { ok: false, error: 'Ten dzień jest już zamknięty. Nie nadrabiasz — wracasz.', status: 400 }
  if (typeof input.note === 'string' && input.note.length > 2000)
    return { ok: false, error: 'Notatka do 2000 znaków', status: 400 }

  const fields = (program.cohortConfig?.checkinFields ?? []) as unknown as FieldDef[]
  const validated = validateCheckinValues(fields, input.values)
  if (!validated.ok) return { ok: false, error: validated.error, status: 400 }

  const day = programDayOf(clock, new Date(`${input.date}T12:00:00Z`))
  if (day < 1 || day > clock.programLength)
    return { ok: false, error: 'Ten dzień jest poza oknem programu', status: 400 }
  const existing = await payload.find({
    collection: 'checkins',
    where: {
      and: [{ user: { equals: user.id } }, { program: { equals: program.id } }, { date: { equals: input.date } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const data = {
    user: user.id,
    program: program.id,
    date: input.date,
    programDay: day,
    minimumDone: input.minimumDone,
    note: input.note ?? '',
    values: validated.values,
  }
  const row = existing.docs[0]
  if (row) {
    await payload.update({ collection: 'checkins', id: row.id, data, overrideAccess: true })
  } else {
    try {
      await payload.create({ collection: 'checkins', data, overrideAccess: true })
    } catch {
      // wyścig na unikalnym (user, program, date): równoległy request utworzył
      // wiersz — ponów jako update
      const again = await payload.find({
        collection: 'checkins',
        where: {
          and: [{ user: { equals: user.id } }, { program: { equals: program.id } }, { date: { equals: input.date } }],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (again.docs[0]) await payload.update({ collection: 'checkins', id: again.docs[0].id, data, overrideAccess: true })
      else return { ok: false, error: 'Nie udało się zapisać — spróbuj ponownie', status: 500 }
    }
  }

  // Auto-ukończenie TYLKO dzisiejszej, odblokowanej lekcji przy minimum. Backfill
  // wczoraj nie ukańcza; nic nigdy nie od-ukańcza.
  if (input.minimumDone && input.date === todayInTz(clock) && isUnlocked(day, clock, new Date(), ctx.isAdmin)) {
    const lesson = await findLessonByDay(payload, program.id, day)
    if (lesson) await upsertCompletion(payload, user.id, lesson, program.id)
  }

  const all = await userCheckins(payload, user.id, program.id)
  return { ok: true, streak: minimumStreak(asRows(all), todayInTz(clock)), programDay: day }
}

export async function saveMeasurementAction(
  payload: BasePayload,
  user: User,
  ctx: CohortContext,
  input: { point: string; values: unknown },
): Promise<{ ok: true } | Fail> {
  const cfg = ctx.program.cohortConfig
  const points = (cfg?.measurementPoints ?? []).map((p) => p.key)
  if (!points.includes(input.point)) return { ok: false, error: 'Nieznany punkt pomiaru', status: 400 }
  const metrics = (cfg?.measurementMetrics ?? []) as unknown as MetricDef[]
  const validated = validateMeasurementValues(metrics, input.values)
  if (!validated.ok) return { ok: false, error: validated.error, status: 400 }

  const existing = await payload.find({
    collection: 'course-measurements',
    where: {
      and: [{ user: { equals: user.id } }, { program: { equals: ctx.program.id } }, { point: { equals: input.point } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const data = {
    user: user.id,
    program: ctx.program.id,
    point: input.point,
    values: validated.values,
    recordedAt: new Date().toISOString(),
  }
  const row = existing.docs[0]
  if (row) await payload.update({ collection: 'course-measurements', id: row.id, data, overrideAccess: true })
  else
    try {
      await payload.create({ collection: 'course-measurements', data, overrideAccess: true })
    } catch {
      // wyścig na unikalnym (user, program, point) — wiersz już jest, pomiar
      // z równoległego requestu wygrał; no-op
    }
  return { ok: true }
}

export async function completeLessonAction(
  payload: BasePayload,
  user: User,
  ctx: CohortContext,
  day: number,
): Promise<{ ok: true } | Fail> {
  if (!Number.isInteger(day)) return { ok: false, error: 'Nieprawidłowy dzień', status: 400 }
  if (!isUnlocked(day, ctx.clock, new Date(), ctx.isAdmin))
    return { ok: false, error: 'Lekcja jeszcze zablokowana', status: 403 }
  const lesson = await findLessonByDay(payload, ctx.program.id, day)
  if (!lesson) return { ok: false, error: 'not found', status: 404 }
  await upsertCompletion(payload, user.id, lesson, ctx.program.id)
  return { ok: true }
}

export async function getTodayData(payload: BasePayload, user: User, ctx: CohortContext) {
  const { clock } = ctx
  const day = programDayOf(clock)
  const today = todayInTz(clock)
  const yesterday = yesterdayInTz(clock)
  const all = await userCheckins(payload, user.id, ctx.program.id)
  const streak = minimumStreak(asRows(all), today)
  const todayCheckin = (all.find((c) => c.date === today) as Checkin) ?? null
  const yesterdayCheckin = (all.find((c) => c.date === yesterday) as Checkin) ?? null
  const state = day < 1 ? ('before' as const) : day > clock.programLength ? ('after' as const) : ('active' as const)
  let lesson: Lesson | null = null
  let unlocksAt: string | null = null
  if (state === 'active') {
    if (isUnlocked(day, clock, new Date(), ctx.isAdmin)) lesson = await findLessonByDay(payload, ctx.program.id, day)
    else unlocksAt = unlockAt(day, clock).toISOString()
  }
  return { programDay: day, state, streak, todayCheckin, yesterdayCheckin, lesson, unlocksAt }
}

export async function getProgressData(payload: BasePayload, user: User, ctx: CohortContext) {
  const all = await userCheckins(payload, user.id, ctx.program.id)
  const rows = asRows(all)
  const completedRes = await payload.find({
    collection: 'lesson-progress',
    where: { and: [{ user: { equals: user.id } }, { program: { equals: ctx.program.id } }] },
    limit: 0,
    depth: 1,
    overrideAccess: true,
  })
  const completedDays = completedRes.docs
    .map((r) => (typeof r.lesson === 'object' && r.lesson ? (r.lesson as Lesson).nr : null))
    .filter((n): n is number => typeof n === 'number')
  const measurementsRes = await payload.find({
    collection: 'course-measurements',
    where: { and: [{ user: { equals: user.id } }, { program: { equals: ctx.program.id } }] },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })
  const completionCfg = ctx.program.cohortConfig?.completion
  const completion = completionStatus(rows, {
    minimumDaysTarget: completionCfg?.minimumDaysTarget ?? 0,
    extraTargets: (completionCfg?.extraTargets ?? []).map((t) => ({
      label: t.label,
      fieldKey: t.fieldKey,
      matchValues: (t.matchValues ?? []) as string[],
      target: t.target,
    })),
  })
  return {
    checkins: rows,
    completedDays,
    measurements: measurementsRes.docs as CourseMeasurement[],
    streak: minimumStreak(rows, todayInTz(ctx.clock)),
    completion,
  }
}
