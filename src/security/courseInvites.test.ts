// Granice zaufania invite'ów: email TYLKO z invite'a, jednorazowość atomowa,
// expiry egzekwowane, jednolite błędy bez wycieku stanu.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.fn()
const find = vi.fn()
const create = vi.fn()
const update = vi.fn()
const drizzleExecute = vi.fn()

vi.mock('payload', () => ({
  getPayload: async () => ({ auth, find, create, update, db: { drizzle: { execute: drizzleExecute } } }),
}))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

const { POST } = await import('@/app/(frontend)/api/courses/join/route')

const validInvite = {
  id: 5,
  email: 'ojciec@example.com',
  program: 7,
  cohort: 2,
  token: 'tok-1',
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  usedAt: null,
}
const req = (body: unknown) => new Request('http://x/api/courses/join', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  vi.clearAllMocks()
  find.mockImplementation(async ({ collection }: { collection: string }) => {
    if (collection === 'course-invites') return { docs: [validInvite] }
    if (collection === 'users') return { docs: [] }
    return { docs: [] }
  })
  create.mockResolvedValue({ id: 42, email: validInvite.email })
  update.mockResolvedValue({})
  drizzleExecute.mockResolvedValue({ rows: [{ id: 5 }] }) // atomowy claim OK
})

describe('POST /api/courses/join', () => {
  it('400 na złym body (hasło < 10 znaków, brak name)', async () => {
    expect((await POST(req({ token: 't', name: 'A', password: 'krotkie' }) as never)).status).toBe(400)
    expect((await POST(req({ token: 't', password: 'wystarczajaco-dlugie' }) as never)).status).toBe(400)
  })

  it('nieznany / zużyty / przeterminowany token → jednolite 403 bez rozróżnienia w statusie', async () => {
    find.mockResolvedValue({ docs: [] })
    expect((await POST(req({ token: 'zly', name: 'A B', password: 'dlugie-haslo-123' }) as never)).status).toBe(403)
    find.mockResolvedValue({ docs: [{ ...validInvite, usedAt: '2026-07-01T00:00:00Z' }] })
    expect((await POST(req({ token: 'tok-1', name: 'A B', password: 'dlugie-haslo-123' }) as never)).status).toBe(403)
    find.mockResolvedValue({ docs: [{ ...validInvite, expiresAt: '2020-01-01T00:00:00Z' }] })
    expect((await POST(req({ token: 'tok-1', name: 'A B', password: 'dlugie-haslo-123' }) as never)).status).toBe(403)
  })

  it("happy path: user tworzony z emailem Z INVITE'A (nie z body), purchases + membership, atomowy claim", async () => {
    const res = await POST(
      req({ token: 'tok-1', name: 'Jan K', password: 'dlugie-haslo-123', email: 'atakujacy@example.com' }) as never,
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, email: 'ojciec@example.com', existing: false })
    const createdUser = create.mock.calls.find((c) => c[0].collection === 'users')?.[0].data
    expect(createdUser.email).toBe('ojciec@example.com') // NIGDY z body
    expect(createdUser.purchases).toEqual([7])
    const member = create.mock.calls.find((c) => c[0].collection === 'cohort-members')?.[0].data
    expect(member).toMatchObject({ user: 42, cohort: 2, program: 7 })
    expect(drizzleExecute).toHaveBeenCalled() // UPDATE ... WHERE used_at IS NULL
  })

  it('istniejące konto: dopisz purchases, NIE twórz usera, NIE ruszaj hasła, existing: true', async () => {
    find.mockImplementation(async ({ collection }: { collection: string }) => {
      if (collection === 'course-invites') return { docs: [validInvite] }
      if (collection === 'users') return { docs: [{ id: 99, email: validInvite.email, purchases: [3] }] }
      return { docs: [] }
    })
    const res = await POST(req({ token: 'tok-1', name: 'Jan K', password: 'dlugie-haslo-123' }) as never)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, existing: true })
    expect(create.mock.calls.find((c) => c[0].collection === 'users')).toBeUndefined()
    const upd = update.mock.calls.find((c) => c[0].collection === 'users')?.[0]
    expect(upd.data.purchases).toEqual([3, 7])
    expect(upd.data.password).toBeUndefined() // hasła istniejącego konta nie nadpisujemy
    const member = create.mock.calls.find((c) => c[0].collection === 'cohort-members')?.[0].data
    expect(member).toMatchObject({ user: 99, cohort: 2, program: 7 })
  })

  it('przegrany wyścig o token (0 wierszy z RETURNING) → 403', async () => {
    drizzleExecute.mockResolvedValue({ rows: [] })
    const res = await POST(req({ token: 'tok-1', name: 'Jan K', password: 'dlugie-haslo-123' }) as never)
    expect(res.status).toBe(403)
  })
})
