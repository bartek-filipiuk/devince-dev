import { describe, it, expect } from 'vitest'
import { groupByStatus, type RoadmapStatus } from './groupByStatus'

const item = (status: RoadmapStatus, id: string) => ({ status, id })

describe('groupByStatus', () => {
  it('orders groups in_progress → planned → done', () => {
    const out = groupByStatus([item('done', 'a'), item('planned', 'b'), item('in_progress', 'c')])
    expect(out.map((g) => g.status)).toEqual(['in_progress', 'planned', 'done'])
  })

  it('preserves input order within a group', () => {
    const out = groupByStatus([item('planned', 'a'), item('planned', 'b'), item('planned', 'c')])
    expect(out[0].items.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('omits status groups that have no items', () => {
    const out = groupByStatus([item('done', 'a')])
    expect(out.map((g) => g.status)).toEqual(['done'])
  })

  it('returns an empty array for empty input', () => {
    expect(groupByStatus([])).toEqual([])
  })
})
