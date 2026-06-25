/**
 * Pure filter that decides which merged PRs become public changelog material.
 * Drops non-user-facing conventional-commit prefixes and anything tagged
 * `[skip-changelog]`, and flags security PRs so the summarizer can phrase them
 * generically (never naming the vuln/vector/version).
 */
export type PR = {
  number: number
  title: string
  body: string
  labels: string[]
}

export type SelectedPR = PR & { isSecurity: boolean }

// Conventional-commit prefixes that are never interesting to end users.
const SKIP_PREFIX = /^(chore|ci|build|test|docs|style|refactor)(\(.+?\))?[:!]/i
const SKIP_TOKEN = /\[skip-changelog\]/i
const SECURITY_PREFIX = /^(security|fix\(sec(urity)?\))/i

export function selectChangelogPRs(prs: PR[]): SelectedPR[] {
  return prs
    .filter((pr) => {
      if (SKIP_PREFIX.test(pr.title)) return false
      if (SKIP_TOKEN.test(`${pr.title}\n${pr.body}`)) return false
      return true
    })
    .map((pr) => ({
      ...pr,
      isSecurity: SECURITY_PREFIX.test(pr.title) || pr.labels.includes('security'),
    }))
}
