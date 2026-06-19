import { describe, it, expect } from 'vitest'
import {
  isEnrolled,
  countCompleted,
  phaseProgress,
  progressFor,
  firstIncompleteLesson,
} from './courseProgress'

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
