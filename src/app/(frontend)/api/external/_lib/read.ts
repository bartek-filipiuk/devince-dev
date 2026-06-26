import { NextRequest, NextResponse } from 'next/server'
import type { Payload } from 'payload'
import { createErrorResponse, createSuccessResponse } from './errors.js'
import { isErrorResponse, parseLocale } from './payload.js'

/**
 * Shared read layer for the external API. Gives agents the ability to LIST a
 * collection (to find an `idOrSlug`) and GET a single document back (to verify a
 * write) — the missing half of an otherwise write-only surface. Each route's GET
 * handler calls `validateAuth` first, then delegates here. Read access uses
 * `overrideAccess: true` + `draft: true` to match the write routes (a trusted,
 * token-authenticated caller sees drafts it just created).
 */
export type ReadableCollection =
  | 'program'
  | 'lessons'
  | 'products'
  | 'posts'
  | 'projects'
  | 'media'
  | 'app-assets'

function clampInt(value: string | null, def: number, min: number, max: number): number {
  const n = parseInt(value ?? '', 10)
  if (Number.isNaN(n)) return def
  return Math.min(max, Math.max(min, n))
}

/** GET list: paginated docs at `?locale=`, optional `?slug=` / `?status=` filters, `?depth=` 0–2. */
export async function readList(
  payload: Payload,
  collection: ReadableCollection,
  request: NextRequest,
): Promise<NextResponse> {
  const locale = parseLocale(request)
  if (isErrorResponse(locale)) return locale

  const sp = request.nextUrl.searchParams
  const page = clampInt(sp.get('page'), 1, 1, 1_000_000)
  const limit = clampInt(sp.get('limit'), 20, 1, 100)
  const depth = clampInt(sp.get('depth'), 0, 0, 2)

  const where: Record<string, unknown> = {}
  const slug = sp.get('slug')
  if (slug) where.slug = { equals: slug }
  const status = sp.get('status')
  if (status) where._status = { equals: status }

  const res = await payload.find({
    collection: collection as never,
    where: where as never,
    page,
    limit,
    depth,
    locale,
    overrideAccess: true,
    draft: true,
    sort: '-createdAt',
  })

  return createSuccessResponse(
    { items: res.docs, page: res.page, limit: res.limit, total: res.totalDocs, totalPages: res.totalPages },
    200,
  )
}

/** GET by id or slug: the full document at `?locale=`, `?depth=` 0–2 (default 1). */
export async function readOne(
  payload: Payload,
  collection: ReadableCollection,
  idOrSlug: string,
  request: NextRequest,
): Promise<NextResponse> {
  const locale = parseLocale(request)
  if (isErrorResponse(locale)) return locale

  const depth = clampInt(request.nextUrl.searchParams.get('depth'), 1, 0, 2)

  let id: number
  if (/^\d+$/.test(idOrSlug)) {
    id = parseInt(idOrSlug, 10)
  } else {
    const found = await payload.find({
      collection: collection as never,
      where: { slug: { equals: idOrSlug } } as never,
      limit: 1,
      depth: 0,
      locale,
      overrideAccess: true,
      draft: true,
    })
    if (found.docs.length === 0) {
      return createErrorResponse('NOT_FOUND', `${collection} not found: ${idOrSlug}`)
    }
    id = found.docs[0].id as number
  }

  try {
    const doc = await payload.findByID({
      collection: collection as never,
      id,
      depth,
      locale,
      overrideAccess: true,
      draft: true,
    })
    return createSuccessResponse(doc as object, 200)
  } catch (error) {
    if ((error as { status?: number }).status === 404) {
      return createErrorResponse('NOT_FOUND', `${collection} not found: ${idOrSlug}`)
    }
    throw error
  }
}
