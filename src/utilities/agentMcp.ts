// MCP uczestnika: rate-limit i rejestracja narzędzi. TWARDE REGUŁY (jak primal60):
// user ZAWSZE z klucza API (authInfo.extra.user), NIGDY z argumentów narzędzia;
// gating re-sprawdzany serwerowo przez cohortActions (fail-closed) — treść
// zablokowanej lekcji nie wychodzi.
import type { createMcpHandler } from 'mcp-handler'
import type { BasePayload } from 'payload'
import { z } from 'zod'
import type { User } from '@/payload-types'
import {
  completeLessonAction,
  getProgressData,
  getTodayData,
  resolveCohortContext,
  saveCheckinAction,
  saveMeasurementAction,
  type CohortContext,
} from './cohortActions'

const WINDOW_MS = 60_000
const MAX_CALLS = 60
const hits = new Map<number, number[]>()

// ponytail: in-memory sliding window — wystarcza dla 1 instancji; Redis gdy repliki
export function rateLimitOk(userId: number): boolean {
  const now = Date.now()
  const list = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS)
  if (list.length >= MAX_CALLS) {
    hits.set(userId, list)
    return false
  }
  list.push(now)
  hits.set(userId, list)
  return true
}

// Slug kursu kohortowego usera: argument wygrywa (tylko spośród JEGO kursów);
// bez argumentu — jedyny kurs albo błąd z listą do wyboru.
export async function resolveProgramSlugForUser(
  payload: BasePayload,
  userId: number,
  requested: string | undefined,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const members = await payload.find({
    collection: 'cohort-members',
    where: { user: { equals: userId } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })
  const programIds = members.docs.map((m) => (typeof m.program === 'object' && m.program ? m.program.id : m.program))
  if (!programIds.length) return { ok: false, error: 'Nie jesteś zapisany na żaden kurs kohortowy.' }
  const programs = await payload.find({
    collection: 'program',
    where: { id: { in: programIds } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })
  const slugs = programs.docs.map((p) => p.slug).filter((s): s is string => typeof s === 'string')
  if (requested) {
    if (slugs.includes(requested)) return { ok: true, slug: requested }
    return { ok: false, error: `Nie masz kursu "${requested}". Dostępne: ${slugs.join(', ')}` }
  }
  if (slugs.length === 1) return { ok: true, slug: slugs[0] }
  return { ok: false, error: `Podaj argument program. Dostępne: ${slugs.join(', ')}` }
}

type ToolResult = { content: { type: 'text'; text: string }[] }
const json = (data: unknown): ToolResult => ({ content: [{ type: 'text' as const, text: JSON.stringify(data) }] })
const fail = (error: string): ToolResult => json({ error })

// Rzeczywisty typ serwera z mcp-handler (McpServer z @modelcontextprotocol/sdk),
// wyprowadzony z sygnatury createMcpHandler — bez bezpośredniej zależności od sdk.
type McpServer = Parameters<Parameters<typeof createMcpHandler>[0]>[0]
type HandlerExtra = { authInfo?: { extra?: Record<string, unknown> } }

const userOf = (extra: HandlerExtra): User | null => {
  const u = extra.authInfo?.extra?.user
  return u && typeof u === 'object' ? (u as User) : null
}

async function withCtx(
  payload: BasePayload,
  user: User,
  programArg: string | undefined,
  fn: (ctx: CohortContext) => Promise<ToolResult>,
): Promise<ToolResult> {
  if (!rateLimitOk(user.id)) return fail('Przekroczony limit 60 wywołań na minutę — odczekaj chwilę.')
  const resolved = await resolveProgramSlugForUser(payload, user.id, programArg)
  if (!resolved.ok) return fail(resolved.error)
  const ctx = await resolveCohortContext(payload, user, resolved.slug)
  if ('error' in ctx) return fail(ctx.error)
  return fn(ctx)
}

export function registerCohortTools(server: McpServer, payload: BasePayload) {
  const programArg = { program: z.string().optional().describe('Slug kursu (wymagany przy >1 kursie)') }

  server.tool(
    'get_today',
    'Dzisiejszy stan kursu kohortowego: dzień programu, streak, dzisiejszy check-in i lekcja dnia (jeśli odblokowana). ZAWSZE wołaj to najpierw; omów z użytkownikiem lekcję, potem zaproponuj check-in.',
    programArg,
    async (args, extra) => {
      const user = userOf(extra)
      if (!user) return fail('unauthorized')
      return withCtx(payload, user, args.program, async (ctx) => {
        const data = await getTodayData(payload, user, ctx)
        return json({
          program_day: data.programDay,
          state: data.state,
          streak: data.streak,
          today_checkin: data.todayCheckin,
          // ponytail: świadomie bez pola content (ciężki Lexical JSON) — tylko
          // pola tekstowe; serializacja richtextu do markdown to możliwe rozszerzenie
          lesson: data.lesson
            ? {
                title: data.lesson.title,
                nr: data.lesson.nr,
                slug: data.lesson.slug,
                why: data.lesson.why,
                what: data.lesson.what,
                dod: data.lesson.dod,
              }
            : null,
          unlocks_at: data.unlocksAt,
        })
      })
    },
  )

  server.tool(
    'save_checkin',
    'Zapisz dzienny check-in (upsert; tylko dziś lub wczoraj, starszych dni nie nadrabiasz). minimumDone napędza streak i auto-ukańcza dzisiejszą lekcję. Rób to po omówieniu lekcji dnia.',
    {
      ...programArg,
      date: z.string().describe('YYYY-MM-DD'),
      minimumDone: z.boolean(),
      note: z.string().max(2000).optional(),
      values: z.record(z.string(), z.unknown()).optional().describe('Pola wg konfiguracji kursu'),
    },
    async (args, extra) => {
      const user = userOf(extra)
      if (!user) return fail('unauthorized')
      return withCtx(payload, user, args.program, async (ctx) => {
        const res = await saveCheckinAction(payload, user, ctx, {
          date: args.date,
          minimumDone: args.minimumDone,
          note: args.note,
          values: args.values,
        })
        return res.ok ? json(res) : fail(res.error)
      })
    },
  )

  server.tool(
    'complete_lesson',
    'Oznacz lekcję danego dnia jako ukończoną (idempotentne; tylko odblokowaną). Wołaj dopiero, gdy użytkownik potwierdzi, że przerobił lekcję.',
    { ...programArg, day: z.number().int().min(1) },
    async (args, extra) => {
      const user = userOf(extra)
      if (!user) return fail('unauthorized')
      return withCtx(payload, user, args.program, async (ctx) => {
        const res = await completeLessonAction(payload, user, ctx, args.day)
        return res.ok ? json(res) : fail(res.error)
      })
    },
  )

  server.tool(
    'get_progress',
    'Pełny postęp uczestnika: check-iny, ukończone dni, pomiary, streak i cele ukończenia. Użyj do podsumowań i motywowania.',
    programArg,
    async (args, extra) => {
      const user = userOf(extra)
      if (!user) return fail('unauthorized')
      return withCtx(payload, user, args.program, async (ctx) => json(await getProgressData(payload, user, ctx)))
    },
  )

  server.tool(
    'save_measurement',
    'Zapisz pomiar w punkcie kontrolnym (np. D0/D30/D60) wg metryk kursu (upsert per punkt). Proponuj w odpowiednich momentach programu.',
    { ...programArg, point: z.string(), values: z.record(z.string(), z.number()) },
    async (args, extra) => {
      const user = userOf(extra)
      if (!user) return fail('unauthorized')
      return withCtx(payload, user, args.program, async (ctx) => {
        const res = await saveMeasurementAction(payload, user, ctx, { point: args.point, values: args.values })
        return res.ok ? json(res) : fail(res.error)
      })
    },
  )
}
