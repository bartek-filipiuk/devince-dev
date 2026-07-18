// Granice zaufania route'ów kohortowych: auth wymagany, userId z sesji,
// jednolite 403 dla nie-zapisanych, walidacja body.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.fn()
const find = vi.fn()
const create = vi.fn()
const update = vi.fn()
const resolveCohortContext = vi.fn()
const saveCheckinAction = vi.fn()
const saveMeasurementAction = vi.fn()

vi.mock('payload', () => ({ getPayload: async () => ({ auth, find, create, update }) }))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/utilities/cohortActions', () => ({
  resolveCohortContext: (...a: unknown[]) => resolveCohortContext(...a),
  saveCheckinAction: (...a: unknown[]) => saveCheckinAction(...a),
  saveMeasurementAction: (...a: unknown[]) => saveMeasurementAction(...a),
}))

const { POST: checkinPOST } = await import('@/app/(frontend)/api/courses/checkin/route')
const { POST: measurementPOST } = await import('@/app/(frontend)/api/courses/measurement/route')
const { POST: agentKeysPOST, DELETE: agentKeysDELETE } = await import(
  '@/app/(frontend)/api/courses/agent-keys/route'
)
const { AGENT_KEY_RE } = await import('@/utilities/agentApiKeys')

const req = (body: unknown) =>
  new Request('http://x/api/courses/checkin', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 1, roles: ['customer'] } })
  resolveCohortContext.mockResolvedValue({ program: { id: 7 }, clock: {}, isAdmin: false })
})

describe('POST /api/courses/checkin', () => {
  it('401 bez sesji', async () => {
    auth.mockResolvedValue({ user: null })
    const res = await checkinPOST(req({ programSlug: 'x', date: '2026-07-05', minimumDone: true }) as never)
    expect(res.status).toBe(401)
  })
  it('400 na złym body (brak minimumDone / złe typy)', async () => {
    expect((await checkinPOST(req({ programSlug: 'x', date: '2026-07-05' }) as never)).status).toBe(400)
    expect((await checkinPOST(req('nie-json-obiekt') as never)).status).toBe(400)
  })
  it('status z resolveCohortContext propagowany (403 forbidden)', async () => {
    resolveCohortContext.mockResolvedValue({ ok: false, error: 'forbidden', status: 403 })
    const res = await checkinPOST(req({ programSlug: 'x', date: '2026-07-05', minimumDone: true }) as never)
    expect(res.status).toBe(403)
  })
  it('happy path: przekazuje input do akcji, zwraca streak; userId NIE pochodzi z body', async () => {
    saveCheckinAction.mockResolvedValue({ ok: true, streak: 3, programDay: 5 })
    const res = await checkinPOST(
      req({ programSlug: 'x', date: '2026-07-05', minimumDone: true, user: 999 }) as never,
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, streak: 3 })
    // drugi argument akcji to user Z SESJI (id 1), nie z body
    expect(saveCheckinAction.mock.calls[0][1]).toMatchObject({ id: 1 })
  })
})

describe('POST /api/courses/measurement', () => {
  it('walidacja body i propagacja statusów jak w checkin', async () => {
    saveMeasurementAction.mockResolvedValue({ ok: true })
    const res = await measurementPOST(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ programSlug: 'x', point: 'D0', values: {} }) }) as never,
    )
    expect(res.status).toBe(200)
    expect((await measurementPOST(new Request('http://x', { method: 'POST', body: '{}' }) as never)).status).toBe(400)
  })
})

describe('/api/courses/agent-keys', () => {
  const post = (body: unknown) =>
    new Request('http://x/api/courses/agent-keys', { method: 'POST', body: JSON.stringify(body) })
  const del = (body: unknown) =>
    new Request('http://x/api/courses/agent-keys', { method: 'DELETE', body: JSON.stringify(body) })

  it('POST 401 bez sesji', async () => {
    auth.mockResolvedValue({ user: null })
    expect((await agentKeysPOST(post({ name: 'laptop' }) as never)).status).toBe(401)
  })

  it('POST z sesją → 200 i key pasujący do AGENT_KEY_RE (plaintext RAZ)', async () => {
    find.mockResolvedValue({ totalDocs: 0, docs: [] })
    create.mockResolvedValue({ id: 42 })
    const res = await agentKeysPOST(post({ name: 'laptop' }) as never)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.key).toMatch(AGENT_KEY_RE)
    // keyHash trafia do DB, plaintext nigdy
    expect(create.mock.calls[0][0].data.keyHash).toBeDefined()
    expect(JSON.stringify(create.mock.calls[0][0])).not.toContain(data.key)
  })

  it('POST szósty aktywny klucz → 409', async () => {
    find.mockResolvedValue({ totalDocs: 5, docs: [] })
    expect((await agentKeysPOST(post({ name: 'laptop' }) as never)).status).toBe(409)
    expect(create).not.toHaveBeenCalled()
  })

  it('DELETE cudzego id (find po user zwraca pusto) → 404', async () => {
    find.mockResolvedValue({ totalDocs: 0, docs: [] })
    expect((await agentKeysDELETE(del({ id: 999 }) as never)).status).toBe(404)
    expect(update).not.toHaveBeenCalled()
  })
})
