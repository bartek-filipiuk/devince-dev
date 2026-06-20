export type ContentFormat = 'markdown' | 'lexical'

interface MetaFields {
  title?: string
  description?: string
  image?: number
}

interface BaseRequest {
  contentFormat?: ContentFormat
  heroImage?: number
  meta?: MetaFields
  _status?: 'draft' | 'published'
  publishedAt?: string
}

export interface CreatePostRequest extends BaseRequest {
  title: string
  content: string | Record<string, unknown>
  categories?: (number | string)[]
  authors?: number[]
}

export interface CreateProjectRequest extends BaseRequest {
  title: string
  description: string | Record<string, unknown>
  technologies?: string[]
  githubUrl?: string
  productionUrl?: string
}

export interface CreateProgramRequest extends BaseRequest {
  title: string
  type: 'course' | 'workshop' | 'event'
  heroHeadline?: string
  heroDescription?: string
  startDate?: string
  endDate?: string
  format?: 'online' | 'physical' | 'hybrid'
  onlineLink?: string
  locationName?: string
  locationAddress?: string
  pricing?: 'free' | 'paid'
  duration?: string
  ctaLabel?: string
  ctaUrl?: string
  // Paid-course price (in smallest currency unit, e.g. grosz/cent).
  priceCents?: number
  currency?: 'pln' | 'eur' | 'usd'
  // Paid-course checkout: the Stripe Payment Link the syllabus "Kup" button
  // points to (metadata.programId = this program's id) + optional price id.
  stripePaymentLink?: string
  stripePriceId?: string
  // Sylabus tab (course syllabus). audience/requirements accept string[] (mapped
  // to the {item} sub-field) for convenience.
  phases?: { letter?: string; name: string; hint?: string }[]
  outcomes?: { title: string; body?: string }[]
  audience?: string[]
  requirements?: string[]
  level?: 'beginner' | 'intermediate' | 'advanced'
  accessMode?: 'paid' | 'lead-magnet'
  featured?: boolean
}

export interface CreateProductRequest {
  title?: unknown
  slug?: unknown
  description?: unknown
  contentFormat?: string
  priceCents?: unknown
  currency?: unknown
  stripePriceId?: unknown
  downloadFiles?: unknown
  coverImage?: unknown
  _status?: unknown
  accessMode?: 'paid' | 'lead-magnet'
}

export interface CreateLessonRequest {
  title?: string
  program?: number | string // id or slug; required on create, not applicable on update
  phase?: string
  order?: number
  nr?: number
  phaseId?: string
  hardGate?: boolean
  hybrid?: boolean
  kind?: 'normal' | 'decision'
  estTimeMin?: { min?: number; max?: number }
  why?: string
  what?: string
  dod?: string
  skills?: string[]
  dependencies?: number[] // lesson ids
  type?: 'text' | 'embed' | 'video' | 'download'
  content?: string | Record<string, unknown>
  contentFormat?: string
  youtubeEmbedUrl?: string
  slug?: string
  publishedAt?: string
  _status?: 'draft' | 'published'
}

export type UpdateLessonRequest = Partial<CreateLessonRequest>

export interface DocSummary {
  id: number
  title: string
  slug: string
  _status: string
  createdAt: string
  updatedAt: string
}
