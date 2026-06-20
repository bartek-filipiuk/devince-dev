import { describe, it, expect } from 'vitest'
import {
  isEnrolled,
  countCompleted,
  phaseProgress,
  progressFor,
  firstIncompleteLesson,
} from './courseProgress'
import { courseStatus, compareStorefront } from './courseProgress'

const lessons = [
  { id: 1, nr: 1, phaseId: 'A' },
  { id: 2, nr: 2, phaseId: 'A' },
  { id: 3, nr: 3, phaseId: 'B' },
] as any

describe('isEnrolled', () => {
  it('false without a user', () => {
    expect(isEnrolled(null, 5)).toBe(false)
  })
  it('true for admins', () => {
    expect(isEnrolled({ roles: ['admin'], purchases: [] } as any, 5)).toBe(true)
  })
  it('true when the program is purchased (id or populated object)', () => {
    expect(isEnrolled({ roles: ['customer'], purchases: [5] } as any, 5)).toBe(true)
    expect(isEnrolled({ roles: ['customer'], purchases: [{ id: 5 }] } as any, 5)).toBe(true)
    expect(isEnrolled({ roles: ['customer'], purchases: [{ id: 9 }] } as any, 5)).toBe(false)
  })
})

describe('progress math', () => {
  it('counts completed', () => {
    expect(countCompleted(lessons, new Set([1, 3]))).toBe(2)
  })
  it('computes per-phase done/total', () => {
    const m = phaseProgress(lessons, new Set([1]))
    expect(m.get('A')).toEqual({ done: 1, total: 2 })
    expect(m.get('B')).toEqual({ done: 0, total: 1 })
  })
  it('computes pct', () => {
    expect(progressFor(4, 1)).toEqual({ done: 1, total: 4, pct: 25 })
    expect(progressFor(0, 0)).toEqual({ done: 0, total: 0, pct: 0 })
  })
  it('finds the first incomplete by order', () => {
    expect(firstIncompleteLesson(lessons, new Set([1]))?.id).toBe(2)
    expect(firstIncompleteLesson(lessons, new Set([1, 2, 3]))).toBeNull()
  })
})

describe('courseStatus', () => {
  it('new when nothing done (incl. total 0)', () => {
    expect(courseStatus(0, 5)).toBe('new')
    expect(courseStatus(3, 0)).toBe('new')
  })
  it('in-progress when partially done', () => {
    expect(courseStatus(2, 5)).toBe('in-progress')
  })
  it('completed when all (or more) done', () => {
    expect(courseStatus(5, 5)).toBe('completed')
    expect(courseStatus(6, 5)).toBe('completed')
  })
})

describe('compareStorefront', () => {
  const item = (o: Partial<Parameters<typeof compareStorefront>[0]>) =>
    ({ featured: false, status: 'new', publishedAt: null, ...o }) as Parameters<typeof compareStorefront>[0]
  const sorted = (arr: any[]) => [...arr].sort(compareStorefront)

  it('pins featured to the very top regardless of status', () => {
    const a = item({ featured: true, status: 'new' })
    const b = item({ featured: false, status: 'in-progress' })
    expect(sorted([b, a])[0]).toBe(a)
  })
  it('orders in-progress → completed → new among non-featured', () => {
    const ip = item({ status: 'in-progress' })
    const done = item({ status: 'completed' })
    const fresh = item({ status: 'new' })
    expect(sorted([fresh, done, ip])).toEqual([ip, done, fresh])
  })
  it('newest first (publishedAt desc) as the tiebreak within a status', () => {
    const older = item({ status: 'new', publishedAt: '2026-01-01T00:00:00Z' })
    const newer = item({ status: 'new', publishedAt: '2026-06-01T00:00:00Z' })
    expect(sorted([older, newer])).toEqual([newer, older])
  })
})
