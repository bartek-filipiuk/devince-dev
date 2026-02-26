import { NextRequest, NextResponse } from 'next/server'
import { getPayload, type Payload } from 'payload'
import configPromise from '@payload-config'
import { markdownToLexical } from './markdown.js'
import { createErrorResponse } from './errors.js'
import type { ContentFormat, DocSummary } from './types.js'

type ErrorResponse = NextResponse<{ error: { code: string; message: string } }>

const VALID_LOCALES = ['pl', 'en'] as const

export async function getPayloadClient(): Promise<Payload> {
  return getPayload({ config: configPromise })
}

export function parseLocale(request: NextRequest): 'pl' | 'en' | ErrorResponse {
  const locale = request.nextUrl.searchParams.get('locale')
  if (!locale) return 'pl'
  if ((VALID_LOCALES as readonly string[]).includes(locale)) {
    return locale as 'pl' | 'en'
  }
  return createErrorResponse(
    'VALIDATION_ERROR',
    `Invalid locale "${locale}". Allowed: ${VALID_LOCALES.join(', ')}`,
  )
}

export function validateContentFormat(
  contentFormat: string | undefined,
): ContentFormat | ErrorResponse {
  const format = contentFormat ?? 'markdown'
  if (format !== 'markdown' && format !== 'lexical') {
    return createErrorResponse(
      'VALIDATION_ERROR',
      'contentFormat must be "markdown" or "lexical"',
    )
  }
  return format
}

/**
 * Converts raw content (string or object) to Lexical format based on contentFormat.
 * Returns the resolved content object, or a NextResponse error if validation fails.
 */
export async function resolveContent(
  raw: string | Record<string, unknown>,
  contentFormat: ContentFormat,
  fieldName: string,
): Promise<Record<string, unknown> | ErrorResponse> {
  if (contentFormat === 'markdown') {
    if (typeof raw !== 'string') {
      return createErrorResponse(
        'VALIDATION_ERROR',
        `${fieldName} must be a string when contentFormat is "markdown"`,
      )
    }
    return markdownToLexical(raw)
  }

  if (raw === null || Array.isArray(raw) || typeof raw !== 'object') {
    return createErrorResponse(
      'VALIDATION_ERROR',
      `${fieldName} must be an object when contentFormat is "lexical"`,
    )
  }
  return raw
}

/**
 * Type guard that narrows a union containing a possible NextResponse error.
 */
export function isErrorResponse<T>(value: T | ErrorResponse): value is ErrorResponse {
  return value instanceof Response
}

/**
 * Resolves a slug or numeric ID string to a numeric document ID.
 * Verifies existence for both slug and numeric ID lookups.
 */
export async function resolveDocId(
  payload: Payload,
  collection: 'posts' | 'projects',
  idOrSlug: string,
  locale: 'pl' | 'en',
): Promise<number | ErrorResponse> {
  const label = collection === 'posts' ? 'Post' : 'Project'

  if (/^\d+$/.test(idOrSlug)) {
    const id = parseInt(idOrSlug, 10)
    try {
      await payload.findByID({ collection, id, depth: 0, locale })
    } catch (error) {
      if ((error as { status?: number }).status === 404) {
        return createErrorResponse('NOT_FOUND', `${label} not found: ${idOrSlug}`)
      }
      throw error
    }
    return id
  }

  const found = await payload.find({
    collection,
    where: { slug: { equals: idOrSlug } },
    limit: 1,
    depth: 0,
    locale,
  })

  if (found.docs.length === 0) {
    return createErrorResponse('NOT_FOUND', `${label} not found: ${idOrSlug}`)
  }

  return found.docs[0].id
}

export function toDocSummary(doc: {
  id: number
  title: string
  slug?: string | null
  _status?: string | null
  createdAt: string
  updatedAt: string
}): DocSummary {
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug ?? '',
    _status: doc._status ?? 'draft',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

export function validateUrl(value: string, fieldName: string): ErrorResponse | null {
  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return createErrorResponse(
      'VALIDATION_ERROR',
      `${fieldName} must start with http:// or https://`,
    )
  }
  return null
}

export function validateArrayField<T>(
  value: unknown,
  fieldName: string,
  itemValidator: (item: unknown) => item is T,
): T[] | ErrorResponse {
  if (!Array.isArray(value)) {
    return createErrorResponse('VALIDATION_ERROR', `${fieldName} must be an array`)
  }
  if (value.some((item) => !itemValidator(item))) {
    return createErrorResponse(
      'VALIDATION_ERROR',
      `${fieldName} contains invalid items`,
    )
  }
  return value as T[]
}
