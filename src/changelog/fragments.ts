/**
 * Changelog fragments — the source of truth for the public changelog.
 *
 * Authoring model: when an agent (or a human) ships a user-facing change, they add
 * one entry to the array below AT WORK TIME, where the full "what + why" context
 * lives. On boot, `ingestChangelogFragments` copies any not-yet-ingested fragments
 * into the `changelog` Payload global (idempotent on `id`). No runtime LLM, no API
 * keys, no webhooks. Fragments live in the module graph (not loose files) so they're
 * bundled into the standalone container, which has no access to raw repo files.
 *
 * To add an entry: append one object. `id` must be unique and stable (it's the
 * idempotency key — never reuse or rename it). Keep notes short ("what changed + a
 * brief why"); tag each `apps | courses | platform | security`. Per-store pages
 * filter by tag (apps sees platform+apps+security; courses platform+courses+security).
 * Phrase security notes generically — never name a vuln/vector/version.
 */
export type Tag = 'apps' | 'courses' | 'platform' | 'security'
export type FragmentNote = { tag: Tag; pl: string; en: string }
export type Fragment = { id: string; date: string; notes: FragmentNote[] }

export const fragments: Fragment[] = [
  {
    id: '2026-06-25-public-changelog',
    date: '2026-06-25',
    notes: [
      {
        tag: 'platform',
        pl: 'Nowa strona „Co nowego" — publiczny changelog na apps i courses, żebyś widział, co i kiedy zmieniamy.',
        en: 'New "What\'s new" page — a public changelog on apps and courses so you can see what we ship and when.',
      },
    ],
  },
]
