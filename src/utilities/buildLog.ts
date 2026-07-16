/**
 * Dane do bloku BuildLogHero: ostatnie wpisy "build loga" (posty + projekty),
 * statystyki platformy i aktualnie budowany element z globala roadmap.
 *
 * Payload przychodzi jako argument (DI) — testowalne bez bazy.
 * Wszystkie zapytania z overrideAccess: false ⇒ tylko opublikowane dokumenty.
 */

type FindResult = {
  docs: Array<{ slug?: string | null; title?: string | null; publishedAt?: string | null }>
  totalDocs: number
}

export type BuildLogPayload = {
  find: (args: {
    collection: string
    depth?: number
    limit?: number
    locale?: string
    overrideAccess?: boolean
    sort?: string
    select?: Record<string, boolean>
    pagination?: boolean
  }) => Promise<FindResult>
  findGlobal: (args: {
    slug: string
    locale?: string
    depth?: number
  }) => Promise<{ items?: Array<{ title?: string | null; status?: string | null }> | null }>
}

export type BuildLogEntry = {
  date: string
  title: string
  href: string
  kind: 'post' | 'project'
}

export type PlatformStats = {
  projectsLive: number
  programsLive: number
  lastShippedAt: string | null
}

const RECENT = {
  depth: 0,
  overrideAccess: false,
  sort: '-publishedAt',
  select: { title: true, slug: true, publishedAt: true },
} as const

async function findRecent(
  payload: BuildLogPayload,
  collection: 'posts' | 'projects',
  locale: string,
  limit: number,
): Promise<FindResult> {
  return payload.find({ ...RECENT, collection, locale, limit })
}

export async function getBuildLogEntries(
  payload: BuildLogPayload,
  locale: string,
  limit = 4,
): Promise<BuildLogEntry[]> {
  const [posts, projects] = await Promise.all([
    findRecent(payload, 'posts', locale, limit),
    findRecent(payload, 'projects', locale, limit),
  ])

  const toEntries = (result: FindResult, kind: BuildLogEntry['kind']): BuildLogEntry[] =>
    result.docs
      .filter((d) => Boolean(d.publishedAt && d.slug && d.title))
      .map((d) => ({
        date: d.publishedAt as string,
        title: d.title as string,
        href: `/${kind === 'post' ? 'posts' : 'projects'}/${d.slug}`,
        kind,
      }))

  return [...toEntries(posts, 'post'), ...toEntries(projects, 'project')]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
}

export async function getPlatformStats(
  payload: BuildLogPayload,
  locale: string,
): Promise<PlatformStats> {
  const [projects, programs, latestPost, latestProject] = await Promise.all([
    // limit: 1 — interesuje nas tylko totalDocs (limit: 0 w Payload zwraca WSZYSTKIE dokumenty)
    payload.find({ collection: 'projects', locale, limit: 1, overrideAccess: false, pagination: true }),
    payload.find({ collection: 'program', locale, limit: 1, overrideAccess: false, pagination: true }),
    findRecent(payload, 'posts', locale, 1),
    findRecent(payload, 'projects', locale, 1),
  ])

  const dates = [latestPost, latestProject]
    .flatMap((r) => r.docs)
    .map((d) => d.publishedAt)
    .filter((d): d is string => Boolean(d))
    .sort((a, b) => b.localeCompare(a))

  return {
    projectsLive: projects.totalDocs,
    programsLive: programs.totalDocs,
    lastShippedAt: dates[0] ?? null,
  }
}

export async function getCurrentlyBuilding(
  payload: BuildLogPayload,
  locale: string,
): Promise<string | null> {
  const roadmap = await payload.findGlobal({ slug: 'roadmap', locale, depth: 0 })
  const wip = (roadmap.items ?? []).find((i) => i.status === 'in_progress')
  return wip?.title ?? null
}
