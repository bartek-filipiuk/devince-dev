export type RoadmapStatus = 'planned' | 'in_progress' | 'done'

export interface RoadmapGroup<T> {
  status: RoadmapStatus
  items: T[]
}

// Display order: what's being worked on first, then what's coming, then shipped.
const STATUS_ORDER: RoadmapStatus[] = ['in_progress', 'planned', 'done']

export function groupByStatus<T extends { status: RoadmapStatus }>(items: T[]): RoadmapGroup<T>[] {
  return STATUS_ORDER.map((status) => ({
    status,
    items: items.filter((it) => it.status === status),
  })).filter((group) => group.items.length > 0)
}
