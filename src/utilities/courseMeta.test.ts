import { describe, it, expect } from 'vitest'
import { courseMeta } from './courseMeta'
const lessons = [
  { phaseId: 'A', hardGate: false, estTimeMin: { min: 20, max: 45 } },
  { phaseId: 'A', hardGate: true, estTimeMin: { min: 60, max: 240 } },
  { phaseId: 'B', hardGate: false, estTimeMin: { min: 30, max: 60 } },
] as any
const phases = [{ id: 'A' }, { id: 'B' }] as any
describe('courseMeta', () => {
  it('counts phases, stages, hard gates and sums time range', () => {
    expect(courseMeta(phases, lessons)).toEqual({
      phases: 2,
      stages: 3,
      hardGates: 1,
      timeMin: 110,
      timeMax: 345,
    })
  })
  it('handles empty/missing', () => {
    expect(courseMeta()).toEqual({ phases: 0, stages: 0, hardGates: 0, timeMin: 0, timeMax: 0 })
  })
})
