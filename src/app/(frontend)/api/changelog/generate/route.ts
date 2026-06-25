import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { runChangelogGenerate, type PayloadLike } from '@/utilities/changelogGenerate'
import { parseCompare } from '@/utilities/githubCompare'
import type { PR } from '@/utilities/changelogSelect'

export const dynamic = 'force-dynamic'

const REPO = 'bartek-filipiuk/devince-dev'

/**
 * Deploy-triggered auto-changelog endpoint. Gated by a shared secret (configure the
 * Coolify "Deployment Success" webhook URL with `?secret=<CHANGELOG_WEBHOOK_SECRET>`;
 * a GitHub Action on push to main can hit the same URL as a fallback). On an authed
 * request it pulls PRs merged since the last entry (GitHub compare API — the
 * container has no `.git`), summarizes them with Claude, and appends one entry to the
 * `changelog` global. Always returns 200 on authed requests so a webhook retry storm
 * can't form; failures are logged and reported in the body.
 */
function authed(request: NextRequest): boolean {
  const secret = process.env.CHANGELOG_WEBHOOK_SECRET
  if (!secret) return false
  const provided =
    request.nextUrl.searchParams.get('secret') ?? request.headers.get('x-changelog-secret') ?? ''
  // HMAC both sides to normalize length before the timing-safe compare.
  const a = crypto.createHmac('sha256', secret).update(provided).digest()
  const b = crypto.createHmac('sha256', secret).update(secret).digest()
  return crypto.timingSafeEqual(a, b)
}

function ghHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN ?? ''}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'devince-changelog',
  }
}

async function ghJson(path: string): Promise<unknown> {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, { headers: ghHeaders() })
  if (!res.ok) throw new Error(`GitHub ${path} -> ${res.status}`)
  return res.json()
}

function mapPulls(json: unknown): PR[] {
  if (!Array.isArray(json)) return []
  return json.map((p) => {
    const o = p as { number?: unknown; title?: unknown; body?: unknown; labels?: unknown }
    return {
      number: Number(o.number ?? 0),
      title: String(o.title ?? ''),
      body: String(o.body ?? ''),
      labels: Array.isArray(o.labels)
        ? (o.labels as { name?: unknown }[]).map((l) => String(l.name ?? ''))
        : [],
    }
  })
}

export async function POST(request: NextRequest) {
  if (!authed(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const payload = (await getPayload({ config: configPromise })) as unknown as PayloadLike
    const result = await runChangelogGenerate({
      payload,
      fetchCompare: async (lastSha) => parseCompare(await ghJson(`/compare/${lastSha}...main`)),
      fetchPullsForCommit: async (sha) => mapPulls(await ghJson(`/commits/${sha}/pulls`)),
      seedSha: process.env.CHANGELOG_SEED_SHA,
    })
    return NextResponse.json({ data: result }, { status: 200 })
  } catch (error) {
    console.error('Changelog generate:', error)
    return NextResponse.json(
      { data: { created: false, prCount: 0, notes: [], error: 'generate_failed' } },
      { status: 200 },
    )
  }
}
