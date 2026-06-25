/**
 * Pure parser for the GitHub "compare two commits" API response
 * (`GET /repos/{owner}/{repo}/compare/{base}...{head}`). The deployed container
 * has no `.git`, so commit history comes from this REST endpoint. Commits are
 * returned oldest-first, so the last one is the head. Tolerant by design: a
 * malformed/empty response yields an empty result, which the orchestrator treats
 * as a no-op rather than crashing the auto-publish pipeline.
 */
export type CompareCommit = { sha: string; message: string }
export type CompareResult = { headSha: string; commits: CompareCommit[] }

export function parseCompare(json: unknown): CompareResult {
  const commitsRaw = (json as { commits?: unknown } | null)?.commits
  if (!Array.isArray(commitsRaw)) return { headSha: '', commits: [] }

  const commits: CompareCommit[] = commitsRaw
    .map((c) => {
      const sha = typeof (c as { sha?: unknown })?.sha === 'string' ? (c as { sha: string }).sha : ''
      const message =
        typeof (c as { commit?: { message?: unknown } })?.commit?.message === 'string'
          ? (c as { commit: { message: string } }).commit.message
          : ''
      return { sha, message }
    })
    .filter((c) => c.sha !== '')

  const headSha = commits.length > 0 ? commits[commits.length - 1].sha : ''
  return { headSha, commits }
}
