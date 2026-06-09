/**
 * Import script for the gated course "od pomysłu do wdrożenia" (Task B7).
 *
 * Boots the Payload Local API and populates `lessons` for the course Program
 * from local markdown in `~/skills-projects/idea-to-mvp-course/`.
 *
 * USAGE:
 *   pnpm tsx scripts/import-course.ts
 *
 * SOURCE PATH (override with COURSE_SRC env):
 *   default: ~/skills-projects/idea-to-mvp-course
 *   - curriculum/*.md  -> one `text` lesson per file (README skipped)
 *   - dist/explorer.html -> uploaded to media + a `download` lesson (best-effort)
 *
 * PROGRAM RESOLUTION:
 *   The course Program is resolved by slug. Default slug is
 *   `od-pomyslu-do-wdrozenia` (matches content/course-od-pomyslu-do-wdrozenia.md).
 *   Override with COURSE_PROGRAM_SLUG env. If not found, a minimal `course`
 *   Program is created so the import can proceed.
 *
 * Idempotent: lessons are matched by (program + slug) and updated in place;
 * re-running does not create duplicates.
 */
import 'dotenv/config'
import fs from 'fs'
import os from 'os'
import path from 'path'

import { getPayload } from 'payload'
import configPromise from '@payload-config'

// Reuse the project's existing markdown -> Lexical converter
// (editorConfigFactory.fromFeatures + convertMarkdownToLexical, with CodeBlock).
import { markdownToLexical } from '../src/app/(frontend)/api/external/_lib/markdown'

// --- Configuration -----------------------------------------------------------

const COURSE_SRC =
  process.env.COURSE_SRC ?? path.join(os.homedir(), 'skills-projects', 'idea-to-mvp-course')

const COURSE_PROGRAM_SLUG = process.env.COURSE_PROGRAM_SLUG ?? 'od-pomyslu-do-wdrozenia'

const CURRICULUM_DIR = path.join(COURSE_SRC, 'curriculum')
const EXPLORER_HTML = path.join(COURSE_SRC, 'dist', 'explorer.html')

// --- Lexical code-block sanitization -----------------------------------------

/**
 * Valid `language` values for the premade Lexical `CodeBlock` (Monaco set, from
 * @payloadcms/richtext-lexical defaultLanguages). The markdown converter copies
 * the raw fence tag verbatim into `fields.language`; a tag outside this set
 * (e.g. ```json) fails the `select` field validation ("Content > Language").
 * We coerce unknown/empty tags to `plaintext` so the DB accepts the value.
 */
const VALID_CODE_LANGUAGES = new Set([
  'abap', 'apex', 'azcli', 'bat', 'bicep', 'cameligo', 'clojure', 'coffee',
  'cpp', 'csharp', 'csp', 'css', 'cypher', 'dart', 'dockerfile', 'ecl',
  'elixir', 'flow9', 'freemarker2', 'fsharp', 'go', 'graphql', 'handlebars',
  'hcl', 'html', 'ini', 'java', 'javascript', 'julia', 'kotlin', 'less',
  'lexon', 'liquid', 'lua', 'm3', 'markdown', 'mdx', 'mips', 'msdax', 'mysql',
  'objective-c', 'pascal', 'pascaligo', 'perl', 'pgsql', 'php', 'pla',
  'plaintext', 'postiats', 'powerquery', 'powershell', 'protobuf', 'pug',
  'python', 'qsharp', 'r', 'razor', 'redis', 'redshift', 'restructuredtext',
  'ruby', 'rust', 'sb', 'scala', 'scheme', 'scss', 'shell', 'solidity',
  'sophia', 'sparql', 'sql', 'st', 'swift', 'systemverilog', 'tcl', 'twig',
  'typescript', 'typespec', 'vb', 'wgsl', 'xml', 'yaml',
])

/**
 * Walk a SerializedEditorState and fix premade `Code` blocks in place:
 *  - coerce out-of-set / empty `language` to `plaintext`;
 *  - strip the leading "undefined" artifact the converter prepends to the code
 *    of a fenced block that had no language tag.
 */
function sanitizeCodeBlocks(state: unknown): unknown {
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>

    if (n.type === 'block' && n.fields && typeof n.fields === 'object') {
      const fields = n.fields as Record<string, unknown>
      if (fields.blockType === 'Code') {
        const lang = typeof fields.language === 'string' ? fields.language : ''
        if (!VALID_CODE_LANGUAGES.has(lang)) {
          // Converter emits `code: "undefined" + body` when language is empty.
          if (lang === '' && typeof fields.code === 'string') {
            fields.code = (fields.code as string).replace(/^undefined/, '')
          }
          fields.language = 'plaintext'
        }
      }
    }

    const children = n.children
    if (Array.isArray(children)) children.forEach(visit)
  }

  if (state && typeof state === 'object' && 'root' in (state as Record<string, unknown>)) {
    visit((state as Record<string, unknown>).root)
  }
  return state
}

// --- Slug helper -------------------------------------------------------------

/**
 * Mirrors Payload's internal `slugify` (payload/dist/utilities/slugify). The
 * `slugField` beforeChange hook always slugifies the provided value on create
 * (e.g. "phase-A-discovery" -> "phase-a-discovery"). We pre-slugify here so the
 * stored slug, the create input, and the (program+slug) lookup all agree —
 * which is what keeps re-runs idempotent.
 */
function slugify(val: string): string {
  return val
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
    .toLowerCase()
}

// --- Lesson ordering / phase derivation --------------------------------------

/** Map a curriculum filename (without extension) to a stable phase label. */
function derivePhase(base: string): string {
  if (base === '00-intro') return 'intro'
  if (base === '01-setup') return 'setup'
  if (base === 'capstone-build-along') return 'capstone'
  if (base === 'config-presets') return 'config'
  if (base === 'resources') return 'resources'
  const phaseMatch = base.match(/^phase-([A-Z])/)
  if (phaseMatch) return phaseMatch[1]
  return base
}

/**
 * Deterministic ordering for the course. Files not listed here are appended
 * after the known sequence (alphabetically) so the import never crashes on a
 * new file, while keeping the canonical curriculum order stable.
 */
const ORDER_SEQUENCE = [
  '00-intro',
  '01-setup',
  'phase-A-discovery',
  'phase-B-differentiation',
  'phase-C-product',
  'phase-D-brand',
  'phase-E-engineering',
  'phase-F-legal',
  'phase-G-design',
  'phase-H-premvp',
  'phase-I-execution',
  'capstone-build-along',
  'config-presets',
  'resources',
]

function deriveOrder(base: string): number {
  const idx = ORDER_SEQUENCE.indexOf(base)
  return idx >= 0 ? idx : ORDER_SEQUENCE.length // unknown files go last
}

/** First H1 heading -> human title; fall back to a prettified filename. */
function deriveTitle(markdown: string, base: string): string {
  const h1 = markdown.match(/^#\s+(.+)$/m)
  if (h1) return h1[1].trim()
  return base.replace(/[-_]/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

// --- Main --------------------------------------------------------------------

type Counts = { created: number; updated: number; skipped: number }

async function main() {
  console.log('=== Course import (Task B7) ===')
  console.log(`Source:          ${COURSE_SRC}`)
  console.log(`Program slug:    ${COURSE_PROGRAM_SLUG}`)

  if (!fs.existsSync(CURRICULUM_DIR)) {
    console.error(`\nFATAL: curriculum directory not found: ${CURRICULUM_DIR}`)
    console.error('Set COURSE_SRC to the course content root.')
    process.exit(1)
  }

  const payload = await getPayload({ config: configPromise })

  // --- Resolve / create the course Program -----------------------------------
  const programId = await resolveProgram(payload)

  // --- Phase 1: curriculum text lessons --------------------------------------
  const textCounts: Counts = { created: 0, updated: 0, skipped: 0 }

  const files = fs
    .readdirSync(CURRICULUM_DIR)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => f.toLowerCase() !== 'readme.md') // README is an outline, not a lesson
    .sort((a, b) => deriveOrder(basename(a)) - deriveOrder(basename(b)))

  console.log(`\n--- Phase 1: curriculum lessons (${files.length} files) ---`)

  for (const file of files) {
    const base = basename(file)
    const slug = base // filename (sans .md) is the stable lesson slug
    const markdown = fs.readFileSync(path.join(CURRICULUM_DIR, file), 'utf8')
    const title = deriveTitle(markdown, base)
    const phase = derivePhase(base)
    const order = deriveOrder(base)
    const content = sanitizeCodeBlocks(await markdownToLexical(markdown))

    await upsertLesson(payload, textCounts, {
      programId,
      slug,
      data: {
        title,
        program: programId,
        phase,
        order,
        type: 'text',
        content,
      },
    })

    console.log(`  [text] #${order} ${slug} -> "${title}" (phase ${phase})`)
  }

  // --- Phase 2: downloadable / embed assets (best-effort) --------------------
  console.log('\n--- Phase 2: downloadable assets (best-effort) ---')
  const assetCounts: Counts = { created: 0, updated: 0, skipped: 0 }
  await importExplorerAsset(payload, programId, assetCounts)

  // TODO(assets): the course bundle ZIP and the playbook PDF are not present in
  // the source tree yet ($COURSE_SRC/bundle contains only loose skill folders +
  // shell scripts, no built .zip; no PDF exists). When those artifacts are
  // produced (e.g. via bundle/package-bundle.sh), upload them to `media` and add
  // `type: 'download'` lessons referencing them via `downloadFile`. Deferred to
  // avoid fabricating assets that do not exist.

  // --- Summary ---------------------------------------------------------------
  console.log('\n=== Summary ===')
  console.log(`Program:              ${COURSE_PROGRAM_SLUG} (id ${programId})`)
  console.log(
    `Text lessons:         created=${textCounts.created} updated=${textCounts.updated} (total processed=${files.length})`,
  )
  console.log(
    `Asset lessons:        created=${assetCounts.created} updated=${assetCounts.updated} skipped=${assetCounts.skipped}`,
  )

  const total = await payload.count({
    collection: 'lessons',
    where: { program: { equals: programId } },
    overrideAccess: true,
  })
  console.log(`Lessons in DB for program: ${total.totalDocs}`)

  console.log('\nDone.')
  process.exit(0)
}

function basename(file: string): string {
  return file.replace(/\.md$/, '')
}

// --- Helpers -----------------------------------------------------------------

type Payload = Awaited<ReturnType<typeof getPayload>>

async function resolveProgram(payload: Payload): Promise<number | string> {
  const bySlug = await payload.find({
    collection: 'program',
    where: { slug: { equals: COURSE_PROGRAM_SLUG } },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })

  if (bySlug.docs[0]) {
    const p = bySlug.docs[0]
    console.log(`Resolved Program: "${p.title}" (id ${p.id}, type ${p.type})`)
    return p.id
  }

  console.log(
    `No Program found with slug "${COURSE_PROGRAM_SLUG}" — creating a minimal course Program.`,
  )
  const created = await payload.create({
    collection: 'program',
    data: {
      title: 'Od pomysłu do wdrożenia',
      slug: COURSE_PROGRAM_SLUG,
      generateSlug: false,
      type: 'course',
      pricing: 'paid',
      _status: 'published',
    } as never,
    overrideAccess: true,
    // The Program afterChange hook calls next/cache revalidatePath, which throws
    // outside a Next request context. Disable it for this script-time create.
    context: { disableRevalidate: true },
  })
  console.log(`Created Program "${created.title}" (id ${created.id})`)
  return created.id
}

async function upsertLesson(
  payload: Payload,
  counts: Counts,
  args: {
    programId: number | string
    slug: string
    data: Record<string, unknown>
  },
): Promise<void> {
  // Pre-slugify so lookup + stored value match what the slugField hook produces.
  const slug = slugify(args.slug)

  const existing = await payload.find({
    collection: 'lessons',
    where: {
      and: [{ program: { equals: args.programId } }, { slug: { equals: slug } }],
    },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })

  const data = {
    ...args.data,
    slug,
    // Keep slugs stable and filename-derived: disable auto-generation from title.
    generateSlug: false,
    _status: 'published',
  }

  if (existing.docs[0]) {
    await payload.update({
      collection: 'lessons',
      id: existing.docs[0].id,
      data: data as never,
      overrideAccess: true,
    })
    counts.updated++
  } else {
    await payload.create({
      collection: 'lessons',
      data: data as never,
      overrideAccess: true,
    })
    counts.created++
  }
}

/**
 * Upload dist/explorer.html into `media` (idempotent by filename) and create a
 * `download` lesson referencing it. Best-effort: logs and skips on any failure.
 *
 * KNOWN BLOCKER (deferred, not faked): the `media` collection rejects
 * `text/html` uploads ("Restricted file type detected") unless
 * `allowRestrictedFileTypes: true` is set on the collection. Per spec §B2 the
 * Explorer should anyway be served through an authenticated route handler
 * (`/api/course/explorer/...`) rather than as a raw public media file, so
 * weakening the Media upload guard here is the wrong fix. When the gated
 * Explorer route lands, serve explorer.html from there (or relax the Media
 * collection deliberately). This function still works for non-restricted
 * asset types (e.g. a future bundle .zip or playbook .pdf).
 */
async function importExplorerAsset(
  payload: Payload,
  programId: number | string,
  counts: Counts,
): Promise<void> {
  if (!fs.existsSync(EXPLORER_HTML)) {
    console.log('  explorer.html not found — skipping.')
    counts.skipped++
    return
  }

  try {
    const filename = 'explorer.html'
    const buffer = fs.readFileSync(EXPLORER_HTML)

    // Idempotent media: reuse an existing upload with the same filename.
    const existingMedia = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      overrideAccess: true,
      depth: 0,
    })

    let mediaId: number | string
    if (existingMedia.docs[0]) {
      mediaId = existingMedia.docs[0].id
      console.log(`  media exists: ${filename} (id ${mediaId})`)
    } else {
      const media = await payload.create({
        collection: 'media',
        data: { alt: 'Skills Explorer (HTML)' },
        file: {
          data: buffer,
          name: filename,
          mimetype: 'text/html',
          size: buffer.byteLength,
        },
        overrideAccess: true,
      })
      mediaId = media.id
      console.log(`  uploaded media: ${filename} (id ${mediaId})`)
    }

    await upsertLesson(payload, counts, {
      programId,
      slug: 'explorer',
      data: {
        title: 'Skills Explorer',
        program: programId,
        phase: 'resources',
        order: deriveOrder('resources') + 1,
        type: 'download',
        downloadFile: mediaId,
      },
    })
    console.log('  [download] explorer -> "Skills Explorer"')
  } catch (err) {
    console.warn(
      `  explorer.html import failed (best-effort, skipping): ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
    counts.skipped++
  }
}

main().catch((err) => {
  console.error('\nFATAL:', err)
  process.exit(1)
})
