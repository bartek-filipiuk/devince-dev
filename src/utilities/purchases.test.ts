import { describe, it, expect } from 'vitest'
import { addProgramToPurchases } from './purchases'

describe('addProgramToPurchases', () => {
  it('adds to empty', () => expect(addProgramToPurchases(null, 'p1')).toEqual(['p1']))
  it('normalizes object ids', () =>
    expect(addProgramToPurchases([{ id: 'p1' }], 'p2')).toEqual(['p1', 'p2']))
  it('is idempotent', () => expect(addProgramToPurchases(['p1'], 'p1')).toEqual(['p1']))
})
